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
    r = await jerkyService.matchIntent('status', req.text);

    if (r) {
        res.send((await jerkyService.isCured()) ? `Yes` : `No`);
        return;
    }

    r = await healthService.matchIntent('status', req.text);

    if (r) {
        res.send((await healthService.getStatus(r)).isCured ? `Yes` : `No`);
        return;
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
const botResult = async (req) => {

    let r = /delete (.*)/i.exec(req.text);

    if (r) {
        return getFile(r[1])
            ? new ActionReference('delete', r[1])
            : new ActionReference('delete_fail', r[1]);
    }

    r = /cured/i.exec(req.text);

    if (r)
        return new ActionReference('jerky');
    }

    r = /is my (.*) cured/i.exec(req.text);

    if (r)
        return new ActionReference('healthStatus', r[1]);
    }

    // etc.

    return null;
}
```

Note that `botResult` only takes `req` as a parameter - that's because it only makes decisions about what action to take, it doesn't take it. 

We'll recode our tests accordingly:

```ts
describe("botResult", () => {

    const tests = [
        ['delete thisrepo', 'delete', 'thisrepo'],
        ['is my beef cured', 'jerky'],
        ['is my dermatitis cured', 'healthStatus', 'dermatitis'],
    ]

    for (const [text, name, ...args] of tests) {
        it(`should call ${name}(${args.join(',')}) when I say "${text}"`, done => {
            botResult({ text }).then(result => {
                expect(result).deep.equals(new ActionReference(name, ...args));
                done();
            });
        });
    }
})
```

Now we have `botResult` returning which action to take in a way we can test. All we need now is the final step - take the action. One way would be a simple `switch`:

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

As promised, we have split `bot` into two functinos - one which returns a result indicating which action to take, independent of how that action is coded, and one which takes that action, independent of the decision making process which selected it.

We come full circle by combining the two:

```ts
const bot = (req, res) => botResult(req).then(result => botAction(res, result));
```

This new `bot` is functionally equivalent to the original `bot`, but its concerns have been cleanly separated.

*Note*: some chatbot systems may not use cleanly separated `req` and `res` arguments -- that's too bad because it makes it harder to enforce this desirable separation of concerns.

## Improving our code

This is progress, but there are new problems:
* Putting every action into a giant `switch` statement is a little awkward.
* `botResult` can create `ActionReference`s whose names do not exist -- we'll only find out when we call `botAction`

Comprehensive tests will help, but defense in depth tell us not to rely on our tests.

It would be nice if `botResult` could only create `ActionReference`s with specific names, with arguments of specific types. We can do that by using an abstraction that creates `ActionReference`s for us, checking against a predefined list of functions. This also fixes the `switch` problem.

```ts
class ActionReferences {
    constructor(getActions) {
        this.getActions = getActions;
        this.reference = {};

        for (const name of Object.keys(getActions())) {
            this.reference[name] = (...args) => new ActionReference(name, ...args);
            }
        };
    }

    doAction(req, result) {
        if (!result instanceof ActionReference)
            return;

        const action = this.getActions(req)[result.name];

        if (!action)
            throw `unknown action ${result.name}`;

        return action(...result.args);
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

Now when `botResult` wants to create an `ActionReference` it does so using `actions.reference`, e.g.

```ts
return actions.reference.healthStatus(r[1]);
```

What's nice about this is that it resembles a normal function call, but instead of executing `healthStatus`, it returns a reference to it. **If you use TypeScript you can even type check the arguments to `healthStatus`!**

Any attempt to reference a nonexistant action will immediately throw an error:

```ts
return actions.reference.goodDog(); // throws because actions.reference doesn't include a "goodDog" property
```

Our revised `botResult` looks like this:

```ts
const botResult = async (req) => {

    let r = /delete (.*)/i.exec(req.text);

    if (r) {
        return getFile(r[1])
            ? actions.reference.delete(r[1])
            : actions.reference.delete_fail(r[1]);
    }

    r = /cured/i.exec(req.text);

    if (r)
        return actions.reference.jerky();
    }

    r = /is my (.*) cured/i.exec(req.text);

    if (r)
        return actions.reference.healthStatus(r[1]);
    }

    // etc.

    return null;
}
```
Our revised `bot` looks like this:

```ts
const bot = (req, res) => botResult(req).then(result => actions.doAction(res, result));
```

Our test for `botResult` stays exactly the same, because `botResult` is still just returning `ActionReference`s, it's just creating them a little differently.

We could reuse our actions test by replacing `botAction` with `actions.doAction`. Or we could individually test each action by calling e.g. `actions.getActions(res).healthStatus('dermatitis)`.

## Conclusion

In this section we saw how it's possible to increase the testability of bots via a clean separation of concerns. We created helper classes called `ActionReference` and `ActionReferences` which make our code highly readable.

## Next

In the next section ("[Introducing Prague](./introducing_prague.md") we'll see other advantages to structuring your application to return a result instead of taking an action directly.
