# Prague

An experimental Rx-based rule system handy for adding conversational features to apps. I thought of it as I walked around Prague on a sunny Spring day. **This is just an experiment and not an official Microsoft project.**

Major features of Prague:
* strongly-typed rules engine for interpreting ambiguous input
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

**EVERYTHING AFTER THIS POINT IS NOW OUT OF DATE - I'LL UPDATE IT AS SOON AS I CAN**

Prague is a strongly-typed rules engine for interpreting ambiguous input.

### Rules

A unit of human input, taken by itself, frequently ranges from ambiguous to downright meaningless. It acquires specific meaning based on the context of the overall state of the system in question, including (but not limited to) the interaction history to date.

The core concept, then, is the `Rule`, which is a function that attempts to interpret a given input in the context of the overall state of the system. It returns a `Match`, an object containing an `action`, which is a closure to be invoked should this Rule's intepretation be accepted. That action might include updating the system state, communicating with the user, communicating with other users, or any of the other infinite number of possibilities afforded by a finite state machine. If a Rule returns null, it could not interpret the input.

Here is a simple rule which does some extremely limited sentiment analysis and responds accordingly:

```typescript
const moody = (input: { text: string }) => {
    const moods = ['sad', 'mad', 'happy'].filter(mood => input.text.indexOf(mood) != -1);
    if (moods.length > 0)
        return () => moods.forEach(mood => console.log(`I hear you are feeling ${mood}`));
    else
        return null;
}
```

Let's try calling this rule:

```typescript
moody({ text: "I'm feeling sad" })
>> { action: [function] }

moody({ text: "My name is Bill" })
>> null;
```

If the rule is successful you can invoke the resultant closure:

```typescript
const match = moody({ text: "I'm feeling sad" });
if (match)
    match.action();

>> I hear you are feeling sad
```

For simple rules calling the rule and its resultant closure like this is fine, but rules and/or their resultant closures can be asynchronous, where things get complicated fast. As a result, Prague supplies a helper function called `doRule` which calls a rule (asynchronously if appropriate) and, if it is successful, invokes the closure (asynchronously if appropriate).

```typescript
doRule({ text: "I'm feeling sad" }, moody);

>> I hear you are feeling sad
```

### Input types

You may have noticed that `moody` takes an object *containing* an input string. Why not just directly pass the string?
* Other metadata may be relevant - a text message may be accompanied by the GPS location of the sender.
* Some rules may not operate on text. Instead, they may intepret images, or sound, or both.
* A given set of rules might use a derived selection of the overall state, e.g. the profile of the user providing the input. As an efficiency and convenience, the application might derive that selection once and provide it to each rule.
* Some inputs have natural actions that can be taken, e.g. responding to a message. As a convenience, some applications might supply these methods to a rule for use in constructing its closure.

As a result, Rules are *typed*. Let's rewrite `moody` slightly:

```typescript
const moody: Rule<I extends ITextInput> = (input) => {
    const moods = ['sad', 'mad', 'happy'].filter(mood => input.text.indexOf(mood) != -1);
    if (moods.length > 0)
        return () => moods.forEach(mood => console.log(`I hear you are feeling ${mood}`));
    else
        return null;
}
```

ITextInput is an interface that comes with Prague. It is defined as follows:

```typescript
interface ITextInput {
    text: string
}
```

Notes:

* we no longer need to supply a type annotation for `input`. It is inferred automatically from the overall type of `moody`. This convention is used commonly in Prague applications.
* we use the `extends` syntax. The input object might satsify other interfaces too, but this rule doesn't make use of them. This convention allows the application to create a single input that satisfies multiple interfaces and supply it to multiple rules, each rule mandating only the interfaces it requires.

A given app might have multiple input sources, each with its own input types. Each one of these is called a *recipe*. A given rule should require the minimum interface necessary to accomplish its goals. A given recipe will implement the superset of all the interfaces required by its rules.

### Rule builders

Prague provides rule builders. Here is a new rule called `namer` using Regular Expressions:

```typescript

const re = new RE<ITextInput>();

const namer = re.rule(/My name is (.*)/, (input, args) =>
    console.log(`Hello, ${args[1]}!`)
);

doRule({ text: "My name is Bill"}, namer);
>> Hello, Bill!
```

Note that re.rele returns a `Rule`. So it is a function which takes a function as input and returns a function as output. Phew! In practice, re.rule runs an input through the supplied regular expression. If it succeeds, it creates a closure which passes the results, plus the original input, to a *handler* function. Handler functions of this form are used extensively throughout Prague.

Here is the same rule implemented using a hypothetical LUIS model:

```typescript
const luis = new LUIS<ITextInput>('modelID', 'modelKey');

const namer = luis.rule('nameForMyModel',
    luis.intent('myName', (input, entities) =>
        console.log(`Hello, ${luis.entityValues(entities, 'name')[0]}!`))
);

doRule({ text: "My name is Bill"}, namer)
>> Hello, Bill!
```

### Multiple rules

Now we have two rules for intepreting user messages. We could apply them both...

```typescript
doRule({ text: "My name is sad"}, namer)
>> Hello, sad!

doRule({ text: "My name is sad"}, moody)
>> I hear that you are feeling sad.
```

... but we immediately run into a common problem. For this we'll use a rule builder called `firstMatch` which runs through a series of rules in order, returning the first match. For this example we'll throw in a few more hypothetical rules:

```typescript
doRule({text: "My name is Bill"}, firstMatch(
    moody,
    namer,
    jukebox,
    pubFinder
]))

>> "Hello, Bill"
```

Note that `firstMatch` itself returns a rule, so you can organize this code differently:

```typescript
doRule({text: "My name is Bill"}, firstMatch(
    moody,
    firstMatch(
        namer,
        jukebox
    ),
    pubFinder
]))

>> "Hello, Bill"
```

There's also `bestMatch`, which runs a list of rules in parallel, and returns the *best* match. This utilizers `Match`'s other component, `score`, which is a number between 0 and 1. If missing, `score` is assumed to be 1. Please note that scores are difficult to calibrate across rules, so this function should be used with all due caution.

### Composing Rules

Most rule builders are relatively primitive. You can *compose* them to create more finely-tuned rules.

First let's refactor `namer`, pulling out a slightly more general-purpose rule in the process:

```typescript
const namester: Rule<ITextInput> = (handler: (input, string) => any) =>
    composeRule(re.rule(/My name is (.*)/, (input, args) => ({
        action: () => handler(input, args[1])
    })));

const namer: Rule<ITextInput> = namester((input, name) => 
    console.log(`Hello, ${name}!`)
);

doRule({ text: "My name is Bill" }, namer);

>> Hello, Bill!
```

Now let's create a version of `namester` that only recognizes the best of all names. Note that there isn't a second argument because there is no output. It either matches or it doesn't, with no further variation.

```typescript
const billster: Rule<ITextInput> = (handler: (input) => any) =>
    composeRule(namester((input, name) => name === 'Bill' ? null : ({
        action: () => handler(input, args[1])
    })));

const billbot: Rule<ITextInput> = billster((input) =>
    console.log(`You have the best name.`)
);

doRule({ text: "My name is Bill" }, billster);

>> Hello, Bill!    
```

Here's how rule composition works: most rule builders transform the input, and pass the result to a handler function via the optional second argument. In rule composition instead of a handler you provide a *transformer*, which takes the result from the first rule and transforms it additionally, passing *that* result to a handler function via the second argument, thus forming a new rule. A given rule has no idea if its handler is the end of the road or another transformer.

### Application state vs. Conversation state

Just as our understanding of the world influences how we interpret the things people say to us, and how we then respond, each input should be evaluated in the context of the entire application state.

Then there is more ephemeral state about the conversation itself. If a user says, "I have a question about life insurance," the app might store that face into a "topic" field in the state associated with that conversation.

### Async

Rules and handlers can return any of the following:
* a value
* an observable
* a promise

Internally all are converted to observables using the `observize` function.

## Recipes

As noted above, a given app might have multiple input sources, each with its own input type. These are called *recipes*. Right now there is one recipe: ReduxChat, for Redux-based browser applications embedding [WebChat](https://github.com/Microsoft/BotFramework-WebChat/). Add your own!

## Patterns

Once you have mastered the fundamentals of Prague you will realize it doesn't do much for you. It is, after all, just a low-level rules engine. 

### Prompts

