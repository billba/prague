# Prague

An experimental Rx-based framework for adding conversational features to apps. I thought of it as I walked around Prague on a sunny Spring day.

Major features of Prague:
* strongly-typed rules engine for interpreting ambiguous human inputs
* support for different types of applications through fine-grained interfaces rather than abstraction
* deeply asynchronous via RxJS

Some types of applications you could build with Prague:
    * Command line
    * Browser app w/chat interface
    * Browser app w/voice interface
    * Slack bot (native interface)
    * Multi-platform Chat bot
    * Server-rendered Website w/pop-up chat

## Getting up and Running

### Building Prague

* clone or fork this repo
* `npm install`
* `npm run build` (or `npm run watch` to build on file changes)

### Using Prague in your app

* `npm install prague -S`
* or, if you're building your own, `npm install file:../path/to/your/repo`
* `import { the, stuff, you, want } from 'prague'` or `import * as Prague from 'prague'`

## Prague 101

At it's heart, Prague is a strongly-typed rules engine for interpreting ambiguous input.

### Rules

The core concept is the **Recognizer**, which interprets input and extracts out semantic content, and the **Handler** which acts upon that content. Recognizers and Handlers formed a matched pair called a **Rule**.

Here is a simple rule which does some extremely limited sentiment analysis and responds accordingly:

```typescript
const moodRule = {
    recognizer: (session: ITextSession) => ({ moods: ['sad', 'mad', 'happy'].filter(mood => session.text.indexOf(mood) != -1) }),
    handler: (session: ITextSession, args: { moods: string[] }) => moods.forEach(mood => console.log(`I hear you are feeling ${mood}`))
}
```

You execute a rule by calling `executeRule` with appropriate input:

```typescript
executeRule({ text: "I'm mad as heck and I'm not going to take it anymore" }, moodRule);
```

### Sessions

The input to both Recognizers and Handlers is called a *Session*, which can take on different forms depending on the application and input source.

### Multiple rules

You could write a single rule to respond to every possible input, but a more typical approach is to break the problem down into a series of rules. Here is one that uses Regular Expressions to identify and extract out the user's name.

const myNameRule = {
    recognizer (session: ITextSession) => /My name is (.*)/.exec(session.text),
    handler: (session: ITextSession, args: RegExpExecArray) => `Hello, ${args[1]}`
}

Now we have two rules, and you can imagine many others. You could call `executeRule` on all of your rules, but most commonly you'll want to stop once one of them succeeds. For this we'll use a helper function called `firstMatch` which runs through a series of rules in order, calling the recognizer for each, stopping at the first one which succeeds, and calling its handler.

```typescript
executeRule({text: "My name is Bill"}, firstMatch(
    moodRule,
    myNameRule,
    jukeboxRule,
    pubFinderRule
]))

>> "Hello, Bill"
```

Note that `firstMatch` itself returns a rule, so you can organize this code differently:

```typescript
executeRule({text: "My name is Bill"}, firstMatch(
    moodRule,
    firstMatch(
        myNameRule,
        jukeboxRule
    ),
    pubFinderRule
]))

>> "Hello, Bill"
```

This actually produces the same results, so it's not a particularly useful example. But it demonstrates that rules are *composable*, which we will make better use of shortly.

(Another approach to a list of rules would be to run through all the rules, calling each recognizer, and only calling the handler for the recognizer which returns the *best* match. This approach requires recognizers which return an agreed-upon format (and scale) for scoring matches.)

### Built-in recognizers

Prague provides built-in recognizers for *LUIS* models and Regular Expressions. Here is myNameRule rewritten to use the built-in recognizer:

```typescript

const re = new RE<ITextSession>();

const myNameRule = re.rule(
    /My name is (.*)/,
    (session, args) => `Hello, ${args[1]}`
)

And here it is using a hypothetical LUIS model:

const luis = new LUIS<ITextSession>({
    name: 'nameForMyModel',
    id: 'myID',
    key: 'myKey'
})

const myNameRule = luis.rule('nameForMyModel', [
    luis.intent('myName', (session, args: { name: string }) => `Hello, ${args.name}`)
])

```

### Application state vs. Conversation state

