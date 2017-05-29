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

## Building Prague

* clone or fork this repo
* `npm install`
* `npm run build` (or `npm run watch` to build on file changes)

## Prague recipes

Prague is a low-level framework. If you want to build an app you will want to use (or create) a `recipe`, which is a set of functionality that allows you to exchange messages with a given channel, using a given state store, etc. Here is a list of available recipes. Please post your own!

* [prague-botframework-browserbot](https://www.npmjs.com/package/prague-botframework-browserbot) - Build in-browser bots using the Bot Framework WebChat
* [prague-nodeconsole](https://www.npmjs.com/package/prague-nodeconsole) - Build Node console bots

## Prague samples

* [BrowserBot](https://github.com/billba/BrowserBot)
* [NodeConsoleBot](https://github.com/billba/NodeConsoleBot)

# Prague 101

Let's write a simple bot that replies the same way to all inputs:

```typescript
const rule = reply("Hello!");
```

Let's be a little more discriminating about when we say Hello, so we introduce a condition that must be satisfied before the action is taken:

```typescript
const rule = rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!"));
```

We need a default reply for when the first rule is not satisfied. That means we have two rules, so we need a way to decide how to evaluate them. `first` tries a given input on each rule, in order, until one succeeds:

```typescript
const rule = first(
    rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!")),
    reply("I don't understand you.")
)
```

Now let's add a new rule that responds to a different pattern:

```typescript
const rule = first(
    rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!")),
    rule(matchRegExp(/I am (.*)/), reply("Nice to meet you!")),
    reply("I don't understand you.")
)
```

`matchRegExp` isn't just a predicate. It also extracts out matching groups, which we can use to customize the reply:

```typescript
const rule = first(
    rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!")),
    rule(matchRegExp(/I am (.*)/), match => match.reply(`Nice to meet you, ${match.groups[1]}!`)),
    reply("I don't understand you.")
)
```

Now let's add another rule which looks for specific names. We do this by adding another condition that must be satisfied before the action is taken:

```typescript
const rule = first(
    rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!")),
    rule(matchRegExp(/I am (.*)/), match => match.groups[1] === 'Bill', reply(`HELLO MY CREATOR`)),
    rule(matchRegExp(/I am (.*)/), match => match.reply(`Nice to meet you, ${match.groups[1]}!`)),
    reply("I don't understand you.")
)
```

This works, but if the name isn't "Bill" we'll end up calling `matchRegExp` twice. let's optimize this:

```typescript
const rule = first(
    rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!")),
    rule(matchRegExp(/I am (.*)/), first(
        rule(match => match.groups[1] === 'Bill', reply(`HELLO MY CREATOR`)),
        match => match.reply(`Nice to meet you, ${match.groups[1]}!`)
    )),
    reply("I don't understand you.")
)
```

This is a simple example to give you a sense of how rules are created and composed in Prague.

## Asynchronous functions

Any Matcher or Handler may optionally return a Promise or an Observable.

## Lots More Tutorial Needed

I know, I know.
