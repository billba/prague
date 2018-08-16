# Prague

An experimental rule system handy for games and conversational user interfaces. I thought of it as I walked around Prague on a sunny Spring day. **This is not an official Microsoft project.**

Major features of Prague:
* strongly-typed when using [TypeScript](https://www.typescriptlang.org) (but you don't have to use TypeScript)
* deeply asynchronous via [RxJS](https://github.com/reactivex/rxjs) (but you don't have to use RxJS)
* utilizes and promotes functional programming (you do actually have to use functional programming)

Some types of applications you could build with Prague:
* OS shell
* Chat bot
* Games

## Building Prague

* clone or fork this repo
* `npm install`
* `npm run build` (or `npm run watch` to build on file changes)

## To add to your app
* `npm install prague`

## Prague Essentials

### `Transform`
The fundamental unit of Prague is a *Transform*:

```ts
type Transform<ARGS extends any[], RESULT | undefined> = (...args: ARGS) => Observable<RESULT | undefined>;
```

A Transform returns an `Observable` of either: 
* `undefined`, meaning no transformation occurred (i.e. the rule was not satisfied), or
* a subclass of the abstract base class `Result`

### `Result`

The following `Result` subclasses are built in, but you can provide your own:
* `Match<VALUE>` - a value
* `Action` - a function to execute at a future time
* `ActionReference` - a serializable reference to a function to execute at a future time
* `Multiple` - an array of `Result`s (typically the result of a tie) to be disambiguated

### `from`

The `from` function allows you to write Tranforms more simply, by returning a value instead a `Match`, a function instead of an `Action`, or a `Promise` or a synchronous result instead of an Observable:

```ts
const repeat = from((a: string) => a.repeat(5))

const confirm = from((a: number) => () => 
console.log(`You picked ${a.toString()}`));

const getName = from((a: string) => fetch(`url/${a}`).then(r => r.json()).then(r => r.name));
```
are equivalent to:
```ts
const repeat = (a: string) => Rx.of.(new Match(a.repeat(5)));

const confirm = (a: number) => Rx.of(new Action(() => console.log(`You picked ${a.toString()}`)));

const getName = (a: string) => Rx.from(fetch(`url/${a}`).then(r => r.json()).then(r => new Match(r.someString)));

```

For your convenience, `from` is automatically called every place you supply a Transform:
```ts
first(
    (t: text) => t === "Bill" && "Bill Barnes",
    t => t === "Hao" && "Hao Lui",
    t => t === "Kevin" && "Kevin Leung",
)
```
is equivalent to:
```ts
first(
    from((t: text) => t === "Bill" && "Bill Barnes"),
    from(t => t === "Hao" && "Hao Lui"),
    from(t => t === "Kevin" && "Kevin Leung"),
)
```
As a result you never need to explicitly call `from` unless you are writing your own helper function.

### working with `Observable`s

Observables are a powerful and flexible approach to writing asynchronous code, but you don't have to go all the way down that rabbit hole to use Prague. To run a Transform you just `subscribe`:

```ts
const repeat = from((a: string, b: number) => a.repeat(b));

repeat("Bill", 2)
    .subscribe(
        result => {
            // handle result here
        },
        err => {
            // handle error here
        },
    )
```

If you think this looks a like like writing resolve/reject handlers for a `Promise`s, you're right. In fact, you can easily convert an `Observable` to a `Promise`:

```ts
import { toPromise } from 'rxjs/operators';

repeat("Bill", 2).pipe(toPromise)
    .then(
        result => {
            // handle result here
        },
        err => {
            // handle error here
        },
    )
```

### Composition via helpers

You can compose Transforms together into a new transform using one of the following high-order functions, or create your own. In all the below helpers, your Transforms are automatically normalized via `from`.

#### `first`

`first` returns a new Transform which calls each of the supplied transforms in turn until one returns a non-`undefined` result, then stops and returns that. If they all return `undefined`, it returns `undefined`. 

```ts
import { first } from 'prague';

const fullName = first(
    (t: string) => t === "Bill" ? "Bill Barnes" : undefined, // line 2
    t => t === "Hao" ? "Hao Luo" : undefined,
    t => t === "Kevin" ? "Kevin Leung" : undefined,
);

fullName("Bill").subscribe(console.log);    // Match{ value: "Bill Barnes" }
fullName("Hao").subscribe(console.log);     // Match{ value: "Hao Luo" }
fullName("Yomi").subscribe(console.log);    // undefined
```

Note that all the Transforms have the same argument types. However you only need to declare the argument types for the first Transform. TypeScript will use those for the rest, and for the new Transform, automatically.

#### `pipe`

`pipe` returns a new Transform which calls each of the supplied Transforms in turn. You supply the arguments for the first, its result is the argument for the second, and so on. If any of the Tranforms return `undefined`, the new Transform returns `undefined`, otherwise the return value is the result of the last Transform.

```ts
import { pipe } from 'prague';

const greet = pipe(
    (a: string, b: string) => a + b,
    fullName,
    m => {
        if (m instanceof Match)
            return `Nice to meet you, ${m.value}.`;
        else
            return `I don't know you.`;
    },
);

greet("Kev", "in").subscribe(console.log);      // Match{ value: "Nice to meet you, Kevin Leung." }
greet("Yo", "mi").subscribe(console.log);       // Match( value: "I don't know you." }
```

Note that you only need to declare the argument types for the first transform. TypeScript will infer the argument types for the rest (and for the new Transform) automatically.

#### `match`

`match` is a special case of `pipe` optimized for the common case of having one outcome if a value is successfully extracted, and another if not. The above can be rewritten as:

```ts
import { match } from 'prague';

const greet = match(
    pipe(
        (a: string, b: string) => a + b,
        fullName,
    ),
    m => `Nice to meet you, ${m.value}.`,
    () => `I don't know you.`,
);
```

#### `if`

`if` is a special case of `match` for the common case of testing a predicate. Beacause `if` is a JavaScript reserved word, if you `import` Prague functions individually you'll need to rename it:

```ts
import { if as _if } from 'prague';

const greet = _if((t: string) => t === "Bill",
    () => `I greet you, my creator!`,
    () => `Meh.`,
);

greet("Bill")
.subscribe(console.log); // Match{ value: "I greet you, my creator!" }
```

#### `tap`

`tap` creates a transform that executes a function but ignores its output, returning its original input. This is a great way to debug:

```ts
pipe(
    (t: string) => t === "Bill" ? "Bill Barnes" : undefined,
    tap(console.log),
    t => t.repeat(2),
).("Bill")
.subscribe();
// Match{ value: "Bill Barnes" }
```

#### `Action` and `run`

Imagine we're creating a chatbot that can respond to several phrases:

```ts
const bot = from((t: string) => {
    if (t === "current time")
        console.log(`The time is ${new Date().toLocaleTimeString()}`);
    else if (t === "I'm hungry")
        console.log(`You shoud eat some protein.`);
    else if (t === "Wassup")
        console.log(`WAAAASSSUUUUUUP!`);
});

bot("Wassup")
.subscribe(); // WAAAASSSUUUUUUP
```

This works, but it isn't the Prague way. Rather than executing code immediately, we prefer to return `Action`s:

```ts
const bot = first(
    _if((t: string) => t === "current time",
        () => () => console.log(`The time is ${new Date().toLocaleTimeString()}`),
    ),
    _if(t => t === "I'm hungry",
        () => () => console.log(`You shoud eat some protein.`),
    ),
    _if(t => t === "Wassup",
        () => () => console.log(`WAAAASSSUUUUUUP!`),
    ),
)
```

Now we can use `tap` to call the action:
```ts
pipe(
    bot,
    tap(m => {
        if (m instanceof Action)
            return m.action();
    }),
)("Wassup")
.subscribe(); // WAAAASSSUUUUUUP
```

This is common enough that Prague provides a helper called `run`:

```ts
pipe(
    bot,
    run,
)("Wassup")
.subscribe(); // WAAAASSSUUUUUUP
```

Obviously actions can do much more than `console.log`. This approach of waiting to executing side effects until you're done is a classic functional programming pattern, and makes for much more declarative code.

#### Scoring: `best`, `sorted`, and `top`

Something we have not touched on is that every `Result` has a `score`, a floating point numeric value between 0 and 1, inclusive. By default this score is 1, but you can specify a different score when creating any `Result`:

```ts
new Match("Bill", .5); // Match{ value: "Bill", score: .5 }
```

Scores are useful when the situation is ambiguous. Say our chatbot asks the user for their name. The user's response might be their name, or they might be ignoring your question and giving a command. How can you know for sure? Certain responses are more likely than others to mean "I am telling you my name". One strategy is to assign a score to each outcome, and choose the highest-scoring outcome. That's where scoring comes in.

In this example we'll first score two different potential responses to a request for a name, then we'll choose the highest scoring one. If there is one, we'll create an action with that score. Finally we'll put that against a differently scored action.

```ts
import { best } from 'prague';

const bot = best
    match(
        best(
            pipe(
                (t: string) => /My name is (.*)/i.exec(t),
                matches => matches.value[1]; // gets converted to a Match of score 1
            },
            t => new Match(t, .5),
        ),
        m => new Action(() => console.log(`Nice to meet you, ${m.value}`), m.score)
    ),
    _if(
        t => t === "current time",
        () => new Action(() => console.log(`The time is ${new Date().toLocaleTimeString()}`), .9),
    ),
);

const test = (a: string) => pipe(
    bot,
    run
).subscribe();

test("Bill"); // Nice to meet you, Bill
test("My name is Bill"); // Nice to meet you, Bill
test("current time"); // The time is 6:50:15 AM
test("My name is current time") // // Nice to meet you, Current Time
```

So far, so good. But consider this case:

```ts
const transforms = [
    () => new Match("hi", .75),
    () => new Match("hello", .75),
    () => new Match("aloha", .70),
    () => new Match("wassup", .65),
];

best(
    ...transforms
)()
.subscribe(console.log) // Match{ value: "hi", score: .75 }
```

Calling `best` can be unsatisfactory when there is a tie at the top. Things get even more challenging if you want to program in some wiggle room, say 5%, so that "aloha" becomes a third valid result.

It turns out that `best` is a special case of a helper called `sorted`, which returns a Transform which calls each supplied Transform with the supplied arguments. If all return `undefined`, it returns `undefined`. If one returns a `Result`, it returns that. If two or more return a `Result`, it returns a `Multiple`, which is a `Result` containing an array of all the `Result`s.

```ts
const sortme = sorted(
    ...transforms
)();

sortme()
.subscribe(console.log); // Multiple{ results:[ /* all the results */ ] }
```

We can narrow down this result using a helper called `top`.

To retrieve just the high scoring result(s):

```ts
pipe(
    sortme,
    top(),
)()
.subscribe(console.log); // Multiple{ results:[ Match{ value: "hi", score: .75 }, Match{ value: "hello", score: .75 }, ] }
```

To include "aloha" we can add a tolerance of 5%:

```ts
pipe(
    sortme,
    top({
        tolerance: .05,
    }),
)()
.subscribe(console.log); // Multiple{ results:[ Match{ value: "hi", score: .75 }, Match{ value: "hello", score: .75 }, Match{ value: "aloha", score: .70 }, ] }
```

We can set a tolerance of 1 (include all the results) but set the maximum results to 3. This will have the same effect as the above:

```ts
pipe(
    sortme,
    top({
        maxResults: 3,
        tolerance: 1,
    }),
)()
.subscribe(console.log); // Multiple{ results:[ Match{ value: "hi", score: .75 }, Match{ value: "hello", score: .75 }, Match{ value: "aloha", score: .70 }, ] }
```

Increasing `tolerance` includes more items in the "high score". It defaults to `0`.

Decreasing `maxResults` limits of the number of "high score" results retrieved. it defaults to `Number.POSITIVE_INFINITY`.

In fact, `best` is just a special case of piping the results of `sorted` into `top`:

```ts
const best = (...transforms) => pipe(
    sorted(...transforms),
    top({
        maxResults: 1,
    }),
);
```

`top` is just one way to narrow down multiple results. There are others. You may apply multiple heuristics. You may even ask for human intervention. For instance, in a chatbot you may wish to ask the user to do the disambiguation ("Are you asking the time, or telling me your name?"). Of course their reply to that may also be ambiguous...

#### `ActionReference`

tk

## Reference

tk

## Samples

Some miscelaneous [samples](samples/test.ts) exist, but mostly tk.

## Tests

These are in the process of being ported from 0.19.1
