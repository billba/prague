# Creating Testable Bots by Separating Concerns

In this chapter we'll look into testing bots and see how it's possible to increase the testability of bots via a clean separation of concerns.

## Testing a bot

Let's say we're building a chatbot that exposes an eclectic variety of services via a conversational interface.

```ts
const bot = async (req, res) => {

    let r = /delete (.*)/i.exec(req.text);

    if (r) {
        if (getFile(r[1])) {
            await fs.delete(r[1]);
            res.send(`I deleted "${r[1]}"`);
        } else {
            res.send(`I can't delete "${r[1]}"`);
        }
        return;
    }

    r = /cured/i.exec(req.text);

    if (r) {
        res.send((await jerkyService.isCured()) ? `Yes` : `No`);
        return;
    }

    r = /is my (.*) cured/i.exec(req.text);

    if (r) {
        res.send((await healthService.getStatus(r[1])).isCured ? `Yes` : `No`);
        return;
    }

    // etc.
}

```

Now let's test it. We'd probably create a mocked version of `res` so that we can examine the results of `send`:

```ts
require('mocha');
const { expect } = require('chai');

describe("bot", () => {

    const tests = [
        ['delete thisrepo', ['I deleted "thisrepo"']],
        ['is my beef cured', ['No']],
        ['is my dermatitis cured', ['No']],
    ]

    for (const [text, responses] of tests) {
        it(`should respond "${responses}" when I say "${text}"`, done => {
            const _responses = [];

            res = {
                send: text => _responses.push(text)
            }
        
            bot({ text }, res).then(() => {
                expect(_responses).deep.equals(responses);
                done();
            });
        });
    }
})
```

The results look good!

```
bot
    ✓ should respond "I deleted "thisrepo"" when I say "delete thisrepo"
    ✓ should respond "No" when I say "is my beef cured"
    ✓ should respond "No" when I say "is my dermatitis cured"

  3 passing (11ms)
```

## The problem with testing bot output

But these successful test results hide a problem. The test for `jerkyService` status is matching an important health question. This is actually pretty obvious from looking at the code, but imagine if, instead of writing our own pattern matching, we instead relied on NLP models, perhaps even supplied by the services themselves. It might look something like:

```ts
    r = await jerkyService.nlp(req.text); // returns arrays of intents and entities

    if (r.intents.find(intent => intent.name === 'status')) {
        res.send((await jerkyService.isCured()) ? `Yes` : `No`);
        return;
    }

    r = await healthService.nlp(req.text); // returns arrays of intents and entities
    if (r.intents.find(intent => intent.name === 'status')) {
        let condition = r.entities.find(entity => entity.name === 'condition');

        if (condition) {
            res.send((await healthService.getStatus(condition)).isCured ? `Yes` : `No`);
            return;
        }
    }
```

Now the conflict in the pattern matching is invisible. Because our tests compare only the text returned, we don't know if that text is being produced by the right code. (Our tests are also very fragile to changes in wording).

This is a direct result of the imperative style used to code `bot` - at some point a decision is made to take an action, the action is taken, and that's that. It's hard to test.

## Moving beyond testing output

There's a different approach, which is to split this into two steps:
1. One function which returns a *result* indicating which action to take
2. One function that *takes* that action

Our test code can separately test the result of `bot`, and the action that it should take. And our running code would simply execute both steps.

Let's create a class representing "an action to take":

```ts
export class ActionReference {

    constructor (
        name: string,
        ...args: any[]
    ) {
        this.name = name;
        this.args = args;
    }
}
```

Now we can recode `bot`:

```ts
const botLogic = async req => {

    let r = /delete (.*)/i.exec(req.text);

    if (r)
        return getFile(r[1])
            ? new ActionReference('delete', r[1])
            : new ActionReference('delete_fail', r[1]);

    r = /cured/i.exec(req.text);

    if (r)
        return new ActionReference('jerky');

    r = /is my (.*) cured/i.exec(req.text);

    if (r)
        return new ActionReference('healthStatus', r[1]);

    // etc.

    return null;
}
```

You may wonder why we created an `ActionReference` class when `botLogic` could just an anonymous object literal:

```ts
if (r)
    return {
        name: 'healthStatus',
        args: [r[1]];
    }
```

Spoiler: later on we will create functions that return other values and it's helpful to have a way to positively distinguish an `ActionReference` (by testing `instanceof ActionReference`) from objects that might happen to include the same properties.

Note that `botLogic` only takes `req` as a parameter - that's because it only makes decisions about which action to take. 

We'll recode our tests accordingly:

```ts
describe("botLogic", () => {

    const tests = [
        ['delete thisrepo', 'delete', 'thisrepo'],
        ['is my beef cured', 'jerky'],
        ['is my dermatitis cured', 'healthStatus', 'dermatitis'],
    ]

    for (const [text, name, ...args] of tests) {
        it(`should call ${name}(${args.join(',')}) when I say "${text}"`, done => {
            botLogic({ text }).then(result => {
                expect(result).deep.equals(new ActionReference(name, ...args));
                done();
            });
        });
    }
})
```

Our new test results look like this:

```
botLogic
    ✓ should call delete(thisrepo) when I say "I deleted "thisrepo"
    ✓ should call jerky() when I say "is my beef cured"
    1) should call healthStatus(dermatitis) when I say "is my dermatitis cured"

  2 passing (11ms)
  1 failing

  1) should call healthStatus(dermatitis) when I say "is my dermatitis cured"

    AssertionError: expected { name: 'jerky', args: [] } to deeply equal { Object (name, args) }
      + expected - actual

       {
      -  "args": []
      -  "name": "jerky"
      +  "args": [
      +    "dermatitis"
      +  ]
      +  "name": "healthStatus"
       }
```

Now our test correctly spots the issue. Someone should really fix that thing.

All we need now is the final step - take the action. Here's one approach:

```ts
const botAction = async (res, result) => {
    if (!result instanceof ActionReference)
        return;

    switch (result.name) {
        case 'delete':
            await fs.delete(result.args[0]);
            res.send(`I deleted "${result.args[0]}"`);
            return;

        case 'deleteFail':
            res.send(`I can't delete "${result.args[0]}"`);
            return;

        case 'jerky':
            res.send((await jerkyService.isCured()) ? `Yes` : `No`);
            return;

        case 'healthStatus':
            res.send((await healthService.getStatus(result.args[0])).isCured ? `Yes` : `No`);
            return;

        default:
            throw `Unknown name ${result.name}`;
    }
}
```

Note that `botAction` takes `res` as an argument, but not `req` -- that's because all the arguments it needs are in `result.args`.

Now we can test each action individually. We might still need to resort to verifying the output, but that's fine, as we have solved the problem of "guess which code produced this output?" 

```ts
describe("actionss", () => {

    const tests = [
        [['delete', 'thisrepo'], ['I deleted "thisrepo"']],
        [['jerky'], ['No']]
        [['healthStatus', 'dermatitis'], ['No']],
    ]

    for (const [[name, ...args], responses] of tests) {
        it(`should respond "${responses}" on ${name}(${args.join(',')})`, done => {
            const _responses = [];

            res = {
                send: text => _responses.push(text)
            }

            botAction(res, new ActionReference('delete', 'thisrepo')).then(() => {    
                expect(_responses).deep.equals(responses)
                done();
            });
        }
    }
});
```

These tests look like this:

```
botLogic
    ✓ should respond 'I deleted "thisrepo"' on delete(thisrepo)
    ✓ should respond 'No' on jerky()
    ✓ should respond 'No' on healthStatus(dermatitis)

  3 passing (11ms)
```

This shows (correctly) that our issue was with the logic determining which action to take, and not with the implementation of the action itself.

As promised, we have split `bot` into two functions -- one which returns a result indicating which action to take, independent of how that action is coded, and one which takes that action, independent of the decision making process which selected it.

We come full circle by combining the two:

```ts
const bot = (req, res) => botLogic(req).then(result => botAction(res, result));
```

This new `bot` is functionally equivalent to the original `bot`, but its concerns have been cleanly separated. Of course, there's nothing stopping us from integration testing `bot` using our original tests. The fact that these tests pass is a great example of the value of unit testing.

*Note*: some chatbot systems may not use cleanly separated `req` and `res` arguments -- that's too bad because it makes it harder to enforce this desirable separation of concerns.

## Improving our code

This is progress, but we've introduced some new potential problems:
* Putting every action into a giant `switch` statement is a little awkward.
* `botLogic` can create `ActionReference`s whose names do not exist -- we'll only find out when we call `botAction`

Comprehensive tests will help, but defense in depth tell us not to rely on our tests.

It would be nice if `botLogic` could only create `ActionReference`s with specific names. We can do that by using an abstraction that creates `ActionReference`s for us, checking against a predefined list of functions. This also fixes the `switch` problem.

```ts
class ActionReferences {

    constructor(getActions) {
        this.getActions = getActions;
        this.reference = {};

        for (const name of Object.keys(getActions()))
            this.reference[name] = (...args) => new ActionReference(name, ...args);
        };
    }

    doAction(...args) {
        return (result) => {
            if (!result instanceof ActionReference)
                return;

            const action = this.getActions(...args)[result.name];

            if (!action)
                throw `unknown action ${result.name}`;

            return action(...result.args);
        }
    }
}
```

Now instead of creating a `botActions` function we create a (very readable) list of actions as functions:

```ts
const actions = new ActionReferences(res => ({
    async delete(arg) {
        await fs.delete(arg);
        res.send(`I deleted "${arg}"`);
    },

    deleteFail(arg) {
        res.send(`I can't delete "${arg}"`);
    },

    jerky() {
        res.send((await jerkyService.isCured()) ? `Yes` : `No`);
    },

    healthStatus(condition) {
        res.send((await healthService.getStatus(condition)).isCured ? `Yes` : `No`);
    },
}));
```

Now when `botLogic` wants to create an `ActionReference` it does so using `actions.reference`, e.g.

```ts
return actions.reference.healthStatus(r[1]);
```

What's nice about this is that it resembles a normal function call, but instead of executing `healthStatus`, it returns a reference to it.

Any attempt to reference a nonexistant action will immediately throw an error:

```ts
return actions.reference.goodDog(); // throws because actions.reference doesn't include a "goodDog" property
```

**Note** TypeScript will catch incorrect method names and argument types at compile time.

Our revised `botLogic` looks like this:

```ts
const botLogic = async req => {

    let r = /delete (.*)/i.exec(req.text);

    if (r)
        return getFile(r[1])
            ? actions.reference.delete(r[1])
            : actions.reference.delete_fail(r[1]);

    r = /cured/i.exec(req.text);

    if (r)
        return actions.reference.jerky();

    r = /is my (.*) cured/i.exec(req.text);

    if (r)
        return actions.reference.healthStatus(r[1]);

    // etc.

    return null;
}
```

Our revised `bot` looks like this:

```ts
const bot = (req, res) => botLogic(req).then(result => actions.doAction(res)(result));
```

Which we can simplify to:

```ts
const bot = (req, res) => botLogic(req).then(actions.doAction(res));
```

Our test for `botLogic` stays exactly the same, because `botLogic` is still just returning `ActionReference`s, it's just creating them a little differently.

We could reuse our actions test by replacing `botAction` with `actions.doAction` and/or we could individually test each action by calling e.g. `actions.getActions(res).healthStatus('dermatitis)`.

## Conclusion

In this section we saw how it's possible to increase the testability of bots via a clean separation of concerns. We created helper classes called `ActionReference` and `ActionReferences` which also makes our code more readable.

## Next

In the [next chapter](./observables.md) we'll briefly learn how to work with (or ignore) `Observable`s, a different way of dealing with async.
