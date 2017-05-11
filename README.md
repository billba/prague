# Prague

An experimental rule system handy for intepreting user input, great for adding conversational features to apps, using lessons learned from the [message router](http://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageRoutingIntro.html) pattern. I thought of it as I walked around Prague on a sunny Spring day. **This is just an experiment and not an official Microsoft project.**

Major features of Prague:
* strongly-typed rules engine for interpreting ambiguous input of all kinds
* support for different types of applications through fine-grained interfaces rather than high-level abstraction
* deeply asynchronous via RxJS

Some types of applications you could build with Prague:
* OS shell
* Browser app w/chat interface
* Browser app w/voice interface
* Slack bot (native interface)
* Multi-platform Chat bot
* Server-rendered Website w/pop-up chat

# Getting up and Running

## Building Prague

* clone or fork this repo
* `npm install`
* `npm run build` (or `npm run watch` to build on file changes)

## Using Prague in your app

* `npm install prague -S`
* or, if you're building your own, `npm install file:../path/to/your/repo`
* `import { the, stuff, you, want } from 'prague'` or `import * as Prague from 'prague'`

# Prague 101

Here is high-level description of every piece of software:

    Event -> Action

Maybe 'Event' is a timer that goes off every minute, or a POST to a REST API, or a message from a WebSocket, or a user action of some kind. How each event is interpreted and handled depends on the context of the overall state of the system in question, including (but not limited to) each user's interaction history to date. For big, complex apps, coding up 'Action' could be quite complex indeed. In life we tend to solve big complex problems by breaking them down. Prague is one way to do that.

Prague can be applied to any kind of event handling, but for now let's focus on the problem of interpreting text input. Specifically let's code up a chatbot that can conduct this simple conversation:

    User: I am Brandon
    App: Hi there, Brandon! Welcome to CafeBot.

We're going to break this problem down by creating a **Rule**:

1. If user says their name, welcome them by name.

Note that this rule is of the form *if this then that*, and we'll further break it down into a **Matcher** (*if this*) and a **Handler** (*then that*).

## Handlers

Let's look at the handler first:

```typescript
const greetGuest = (match) => {
    match.reply(`Hi there, ${match.name}! Welcome to CafeBot.`);
}

greetGuest({ name: "Brandon", reply: console.log });
>> "Hi there, Brandon! Welcome to CafeBot."
```

By convention, a Handler has one parameter, an object called `match` because it is the output of a Matcher. Also by convention, `match` includes the common tools (like `reply`) that a handler might need. By including those tools in `match` we can easily use dependency injection to replace `console.log` with a function that sends a reply to a chat app, or a function that returns text to a testing harness, allowing us to validate our business logic.

It already sounds like this approach might be a little error-prone. What if we pass the wrong kind of object? Let's use TypeScript to help protect ourselves from simple coding errors by adding type annotations.

We could do it this way:

```typescript
const greetGuest = (match: { name: string, reply: (text: string) => void }) => {
    match.reply(`Hi there, ${match.name}! Welcome to CafeBot.`);
}
```

But let's use a [constrained generic](https://www.typescriptlang.org/docs/handbook/generics.html#generic-constraints) instead:

```typescript
const greetGuest = <M extends { name: string, reply: (text: string) => void }>(match: M) => {
    match.reply(`Hi there, ${match.name}! Welcome to CafeBot.`);
}
```

Now TypeScript will complain if we try calling `greetGuest` with missing or incorrect fields:

```typescript
greetGuest({ name: "Brandon" }); // missing "reply" -- will give error
```

But because we used a constrained generic, TypeScript will not complain if we have *extra* fields:

```typescript
greetGuest({ name: "Brandon", reply: console.log, cafe });
>> "Hi there, Brandon! Welcome to CafeBot."
```

No harm, no foul. We'll see the utility of this shortly.

This user input might have originated from a chat app, or a voice-operating kiosk, or a command line, or a test case, or even another bot. From the point of the Handlers, so long as `match` includes the right fields, it doesn't know or care. This loose coupling is an important concept in Prague.

The way we connect application events (like user input) to Rules is via a **Recipe**.

## Recipes

Let's make a Recipe for a simple Node console application:

```typescript
import readline = require('readline');

const runNodeConsole = <M>(rule: IRule<M>) => {
    const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
    });

    rl.on('line', (text: string) => rule.callHandlerIfMatch({
        text,
        reply: console.log
    }));
}
```

Every time the user types a line of text, it is put into an object along with a `reply` method (so that's where it comes from!) and sent to a method called `rule.callHandlerIfMatch`, which we'll come back to.

The object coming out of this recipe contains the text the user typed. Now we need to see if that text matches the pattern "I am [name]" and, if so, extract the `name` from it. This is the job of the Matcher.

## Matchers

```typescript
const matchName = <M extends { text: string }>(match: M) => {
    const regExpResult = /I am (.*)/.exec(match.text);
    return regExpResult && {
        ... match,
        name: regExpResult[1]
    }
}
```

A Matcher *filters* and/or *transforms* its input. This one use a Regular Expression to test the user's input against the pattern we're looking for. If there's no match it return `null`, indicating no match. If it succeeds, it returns a new object containing all of the fields of the input object plus the name.

## Rules and Helpers

Now let's create a Rule for this scenario, and pass it to our recipe. Prague supplies **Helpers** with a bunch of useful, well, helpers. You provide the type of the main input object which, for now, is the same as the *output* type of NodeConsole.

```typescript
interface INodeConsoleMatch {
    text: string;
    reply: (text: string) => void;
}

import { Helpers } from 'prague';
const { rule } = Helpers<INodeConsoleMatch>();

const nameRule = rule(matchName, greetGuest);

runNodeConsole(nameRule);
>> "I am Brandon"
>> "Hi there, Brandon! Welcome to CafeBot."
```

We've made our first Prague app!

This seems like a little more code than should be necessary for such a simple app. As it happens, matching Regular Expressions is a very common scenario, and there are `RegExpHelpers` that can make things more concise, specifically a method called `re` which takes a RegExp and a Handler and returns a Rule. Also this is a good time to admit that `INodeConsoleMatch` and `NodeConsole` are built in:

```typescript
import { RegExpHelpers, INodeConsoleMatch, NodeConsole } from 'prague';
const { re } = RegExpHelpers<INodeConsoleMatch>();

const nameRule = re(/I am (.*)/, match => match.reply(`Hi there, ${match.groups[1]}! Welcome to CafeBot.`));

runNodeConsole(nameRule);
```

That seems like an appropriate amount of code for such a simple conversation.

Using the interface `INodeConsoleMatch` when creating the `RegExpHelpers` object gives us some typing magic - we don't need to explicitly define the type of `match` in the helper we passed to `re`. If you mouse over `match` in the above code in your editor, you would see that the type of `match` is known to be `INodeConsoleMatch & IRegExpArray`, the latter being the return type of calling `RegExp.exec`. Using interfaces like this allow us to write very concise, type-safe code. Plus you get intellisense to tell you what fields are available at a given point.

## Multiple rules

Let's add a little empathy to our chatbot:

    User: I'm feeling a little sad.
    App: I hear you are feeling sad.

Here is a simple rule which does some extremely limited sentiment analysis and responds accordingly:

```typescript
const moodyRule = re(/.*(sad|mad|happy).*/, match => match.reply(`I hear you are feeling ${match.groups[1]}`));
```

Now we have two rules. But we can only pass one rule to `runNodeConsole`. We can create one rule out of two using the `first` helper:

```typescript
const { first } = Helpers<INodeConsoleMatch>();

const appRule = first(nameRule, moodyRule);

runNodeConsole(appRule);
>> "I am Brandon"
>> "Hi there, Brandon! Welcome to CafeBot."
>> "I'm feeling a little sad."
>> "I hear you are feeling sad."
```

What's happening here is that `first` tries the rules in order. If the matcher in `nameRule` succeeds, it calls its helper. Otherwise it tries `moodyRule`. If that doesn't match, nothing happens. The important concept is that `first` returns a rule. That means you can use it anywhere you expect a rule, including as a parameter to a different call to `first`.

Let's try one more input:

```typescript
>> "I am sad"
>> "Hi there, sad! Welcome to CafeBot."
```

Oops. We could resolve this particular problem by swapping the order of the rules in the call to `first`, or maybe by coding our Regular Expressions tightly. Welcome to the wonderful world of ambiguous human input!

## Transforming the input object

The owner of our favorite cafe has seen our chatbot. She liked it so much she wants to make it available to her customers. Of course, she'd like to add some functionality:

    User: I want coffee.
    App: Great choice! I've placed your order for coffee.

Let's assume the cafe already has an ordering system in place via a `cafe` object of class `Cafe`. Now we need to make that object available to our helper. We do that with a new Matcher:

```typescript
const matchCafe = <M>(match: M) => ({
    ... match,
    cafe
});
```

Note that, since all `matchCafe` does is add to the input object, it requires no constraints on its type.

Now we can build a rule that takes advantage of this new capability. It's time to adopt a new type definition and use it when creating our helpers:

```typescript
interface ICafeMatch{
    cafe: Cafe;
}

type ICafeBotMatch = INodeConsoleMatch & ICafeMatch;

const { re } = RegExpHelpers<ICafeBotMatch>();

const placeOrder = re(/I want (.*)/, match => {
    match.cafe.placeOrder(order);
    match.reply(`Great choice! I've placed your order for ${match.order}.`);
})
```

Without that revised type definition, TypeScript would complain when we called `match.cafe.placeOrder` in our helper.

Now you can see why it's helpful to define input types narrowly using constrained generics. It allows us to separate concerns by writing functions that only require the fields they need. The matcher called by `re`, for example, requires only that its input have a field `text` of type `string`. So we can use it, untouched, with any Recipe that supplies such a field.

Now we need to do several things:

Now we need to add `matchCafe` into our pipeline. We use a helper called `prepend` which takes a Matcher and a Rule and only runs the Rule if the Matcher succeeds. Like `first`, `prepend` itself returns a Rule.

Here's the complete CafeBot:

```typescript
import { Helpers, RegExpHelpers } from 'prague';

const { prepend } = Helpers<INodeConsoleMatch>();

interface ICafeMatch{
    cafe: Cafe;
}

type ICafeBotMatch = INodeConsoleMatch & ICafeMatch;

const { first } = Helpers<ICafeBotMatch>();
const { re } = RegExpHelpers<ICafeBotMatch>();

const matchCafe = <M>(match: M) => ({
    ... match,
    cafe
});

const nameRule = re(/I am (.*)/, match => match.reply(`Hi there, ${match.groups[1]}! Welcome to CafeBot.`));

const moodyRule = re(/.*(sad|mad|happy).*/, match => match.reply(`I hear you are feeling ${match.groups[1]}`));

const placeOrder = re(/I want (.*)/, match => {
    match.cafe.placeOrder(order);
    match.reply(`Great choice! I've placed your order for ${match.order}.`);
})

const appRule = prepend(
    matchCafe,
    first(
        moodyRule,
        nameRule,
        placeOrder
    )
);

runNodeConsole(appRule);
```

This code is extremely expressive and declarative in nature. It's easy to visualize the data flowing through the system:

1. runNodeConsole receives the user input and adds the `reply` function.
2. matchCafe adds the `cafe` object
3. `first` sends the enhanced input to each rule in series, stopping when one matches the input, and calling its handler

## Asynchronous functions

Any Matcher or Handler may optionally return a Promise or an Observable.

## Applications and State

Now that you've been introduced to Rules, Matchers, and Handlers, the key helpers, and the type system, we can look into what it takes to build more complex apps using state.

## Prompts

Here I'll talk about Prompts.
