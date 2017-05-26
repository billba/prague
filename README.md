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

* [prague-botframework-browserbot](https://www.npmjs.com/package/prague-botframework-browserbot) - Build

## Prague samples

* [BrowserBot](https://github.com/billba/BrowserBot)

# Prague 101

Let's write a simple bot:

```typescript
const rule = reply("Hello!");
```

```typescript
const rule = rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!"));
```

```typescript
const rule = rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!"));
```

```typescript
const rule = first(
    rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!")),
    reply("I don't understand you.")
)
```

```typescript
const rule = first(
    rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!"));
    rule(matchRegExp(/I am (.*)/), reply("Nice to meet you!")),
    reply("I don't understand you.")
)
```

```typescript
const rule = first(
    rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!")),
    rule(matchRegExp(/I am (.*)/), match => match.reply(`Nice to meet you, ${match.groups[1]}!`)),
    reply("I don't understand you.")
)
```

```typescript
const rule = first(
    rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!")),
    rule(matchRegExp(/I am (.*)/), match => match.groups[1] === 'Bill', match => match.reply(`HELLO MY CREATOR`)),
    rule(matchRegExp(/I am (.*)/), match => match.reply(`Nice to meet you, ${match.groups[1]}!`)),
    reply("I don't understand you.")
)
```

```typescript
const rule = first(
    rule(matchRegExp(/Hello|Hi|Wassup/), reply("Hello!")),
    rule(matchRegExp(/I am (.*)/), first(
        rule(match => match.groups[1] === 'Bill', match => match.reply(`HELLO MY CREATOR`)),
        rule(match => match.reply(`Nice to meet you, ${match.groups[1]}!`))
    )),
    reply("I don't understand you.")
)
```

## Asynchronous functions

Any Matcher or Handler may optionally return a Promise or an Observable.

## Applications and State

Now that you've been introduced to Rules, Matchers, and Handlers, the key helpers, and the type system, we can look into what it takes to build more complex apps using state.

## Prompts

Here I'll talk about Prompts.
