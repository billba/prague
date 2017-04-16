# Prague

An experimental Rx-based framework for adding conversational features to apps. I thought of it as I walked around Prague on a sunny Spring day. **This is just an experiment and not an official Microsoft project.**

Major features of Prague:
* strongly-typed rules engine for interpreting ambiguous input
* support for different types of applications through fine-grained interfaces rather than abstraction
* deeply asynchronous via RxJS

Some types of applications you could build with Prague:
    * OS shell
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

The core concept is the **Matcher**, which interprets input and extracts out semantic content, and the **Action** which acts upon that content. Matchers and Actions formed a matchered pair called a **Rule**.

Here is a simple rule which does some extremely limited sentiment analysis and responds accordingly:

```typescript
const moodRule = {
    matcher: (input: ITextInput) => ({ moods: ['sad', 'mad', 'happy'].filter(mood => input.text.indexOf(mood) != -1) }),
    action: (input: ITextInput, args: { moods: string[] }) => moods.forEach(mood => console.log(`I hear you are feeling ${mood}`))
}
```

You execute a rule by calling `executeRule` with appropriate input:

```typescript
executeRule({ text: "I'm mad as heck and I'm not going to take it anymore" }, moodRule);
```

### Inputs

The input to both Matchers and Actions is called an *Input*, which can take on different forms depending on the application and input source. It typically includes the original input plus a variety of helper data and functions.

### Built-in matchers

Prague provides built-in matchers for *LUIS* models and Regular Expressions. Here is a new rule called myNameRule which uses the built-in matcher:

```typescript

const re = new RE<ITextInput>();

const myNameRule = re.rule(
    /My name is (.*)/,
    (input, args) => `Hello, ${args[1]}`
)

And here it is using a hypothetical LUIS model:

const luis = new LUIS<ITextInput>({
    name: 'nameForMyModel',
    id: 'myID',
    key: 'myKey'
})

const myNameRule = luis.rule('nameForMyModel', [
    luis.intent('myName', (input, args: { name: string }) => `Hello, ${args.name}`)
])

```

### Multiple rules

You could write a single rule to respond to every possible input, but a more typical approach is to break the problem down into a series of rules.

You could call `executeRule` on all of your rules, but most commonly you'll want to stop once one of them succeeds. For this we'll use a helper function called `firstMatcher` which runs through a series of rules in order, calling the matcher for each, stopping at the first one which succeeds, and calling its action.

```typescript
executeRule({text: "My name is Bill"}, firstMatcher(
    moodRule,
    myNameRule,
    jukeboxRule,
    pubFinderRule
]))

>> "Hello, Bill"
```

Note that `firstMatcher` itself returns a rule, so you can organize this code differently:

```typescript
executeRule({text: "My name is Bill"}, firstMatcher(
    moodRule,
    firstMatcher(
        myNameRule,
        jukeboxRule
    ),
    pubFinderRule
]))

>> "Hello, Bill"
```

This actually produces the same results, so it's not a particularly useful example. But it demonstrates that rules are *composable*, which we will make better use of shortly.

(Another approach to a list of rules would be to run through all the rules, calling each matcher, and only calling the action for the matcher which returns the *best* matcher. This approach requires matchers which return an agreed-upon format (and scale) for scoring matchers.)

### Application state vs. Conversation state

Just as our understanding of the world influences how we interpret the things people say to us, and how we then respond, each input should be evaluated in the context of the entire application state.


In an OS shell, the state might include the current directory. If a user says "remove this directory", the action will rely on that state to remove the correct directory. The state might also include data about the conversation itself. If a user says "create a directory named connectors" followed by "delete it", the 

### Prompts

### Async

