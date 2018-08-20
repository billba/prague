# *Prague*

A rule system handy for games and conversational user interfaces. I thought of it as I walked around the city of Prague on a sunny Spring day. **This is not an official Microsoft project.**

Major features of Prague:
* strongly-typed when using [TypeScript](https://www.typescriptlang.org) (but you don't have to use TypeScript)
* deeply asynchronous via [RxJS](https://github.com/reactivex/rxjs) (but you don't have to use RxJS)
* utilizes and promotes functional programming (you do actually have to use functional programming)

Some types of applications you could build with *Prague*:
* OS shell
* Chat bot
* Games

## Building *Prague*

* clone this repo
* `npm install`
* `npm run build` (or `npm run watch` to build on file changes)

## To add to your app
* `npm install prague`

## *Prague* Essentials

### `Transform`
The fundamental unit of *Prague* is a special type of function called a `Transform`:

```ts
type Transform<ARGS extends any[], RESULT extends Result> = (...args: ARGS) => Observable<RESULT>;
```

A `Transform` is called with arguments as normal. If a transformation occurred, the resultant `Observable` emits a `Result` object and completes, oherwise it ompletes without emitting.

If you're new to `Observable`s and none of this makes sense to you, you may want to read [Obervables and Promises](#observables-and-promises), which has both a quick introduction to `Observable`s and also shows how to ignore them and just work with `Promise`s. 

### `Result`

`Result` is an abstract base class. The following two subclasses of `Result` are "core" to *Prague*:
* `Value<VALUE>` - contains a value of type VALUE
* `Action` - contains an action (function) to potentially execute at a future time

*Prague* also includes and makes use of these subclasses of `Result`:
* `ActionReference` - contains the (serializable) name and arguments of a function to potentially execute at a future time
* `Multiple` - contains an array of `Result`s
* `NoResult` - a way to get a positive "no result" signal from a `Transform` using [emitNoResults](#noresult)

### `from`

The `from` function allows you to write `Tranform`s more simply, by returning a value instead a `Value`, a function instead of an `Action`, `undefined`/`null` when nothing is to be emitted, or a `Promise` or a synchronous result instead of an `Observable`:

```ts
const repeat = from((a: string) => a.repeat(5))

const confirm = from((a: number) => () => 
console.log(`You picked ${a.toString()}`));

const getName = from((a: string) => fetch(`url/${a}`).then(r => r.json()).then(r => r.name));
```
are equivalent to:
```ts
const repeat = (a: string) => Rx.of.(new Value(a.repeat(5)));

const confirm = (a: number) => Rx.of(new Action(() => console.log(`You picked ${a.toString()}`)));

const getName = (a: string) => Rx.from(fetch(`url/${a}`).then(r => r.json()).then(r => new Value(r.someString)));
```

For your convenience, `from` is automatically called every place you supply a `Transform`:
```ts
first(
    (t: string) => t === "Bill" ? "Bill Barnes" : null,
    t => t === "Hao" ? "Hao Luo" : null,
    t => t === "Kevin" ? "Kevin Leung" : null,
)
```
is equivalent to:
```ts
first(
    from((t: string) => t === "Bill" ? "Bill Barnes" : null),
    from(t => t === "Hao" ? "Hao Luo" : null),
    from(t => t === "Kevin" ? "Kevin Leung" : null),
)
```
As a result you never need to explicitly call `from` unless you are writing your own helper function.

### Composition via helpers

You can compose `Transform`s together into a new transform using one of the following high-order functions, or create your own. In all the below helpers, your `Transform`s are automatically normalized via `from`.

#### `first`

`first` returns a new `Transform` which calls each of the supplied `Transform`s in turn. If one emits a `Result`, it stops and returns that. If none emit a `Result`, it doesn't either. 

```ts
import { first } from 'prague';

const fullName = first(
    (t: string) => t === "Bill" ? "Bill Barnes" : null,
    t => t === "Hao" ? "Hao Luo" : null,
    t => t === "Kevin" ? "Kevin Leung" : null,
);

fullName("Bill").subscribe(console.log);    // Value{ value: "Bill Barnes" }
fullName("Hao").subscribe(console.log);     // Value{ value: "Hao Luo" }
fullName("Yomi").subscribe(console.log);    //
```

Note that all the `Transform`s have the same argument types. However you only need to declare the argument types for the first `Transform`. TypeScript will use those for the rest, and for the resultant `Transform`, automatically.

#### `pipe`

`pipe` returns a new `Transform` which calls each of the supplied `Transform`s in turn. You supply the arguments for the first, its `Result` is the argument for the second, and so on. If all of the `Transform`s emit a `Result`, the the new `Transform` emits the last one, otherwise it doesn't emit.

```ts
import { pipe } from 'prague';

const someAssemblyRequired = pipe(
    (a: string, b: string) => a + b,
    fullName,
);

someAssemblyRequired("Kev", "in").subscribe(console.log);      // Value{ value: "Kevin Leung." }
someAssemblyRequired("Yo", "mi").subscribe(console.log);       //
```

Note that you only need to declare the argument types for the first transform. TypeScript will infer the argument types for the rest (and for the resultant `Transform`) automatically.

#### `match`

Consider this `Transform`:

```ts
const greet = first(
    pipe(
        fullName,
        m => `Nice to meet you, ${m.value}.`,
    ),
    () => `I don't know you.`,
)

greet("Kevin").subscribe(console.log);     // Value{ value: "Nice to meet you, Kevin Leung." }
greet("Yomi").subscribe(console.log);      // Value{ value: "I don't know you." }
```

if `fullName` emits, we do one thing, otherwise we do another. This is a very common case, and the `match` helper is a little shorter and a lot more expressive. Here's the same `Transform`, rewritten with `match`:

```ts
import { match } from 'prague';

const greet = match(
    fullName,
    m => `Nice to meet you, ${m.value}.`,
    () => `I don't know you.`,
);
```

#### `if`

`if` is a special case of `match` for the common case of testing a "truthy" predicate.

**Note**: Because `if` is a JavaScript reserved word, if you `import` *Prague* functions individually you'll need to rename it:

```ts
import { if as _if } from 'prague';

const greet = _if(
    (t: string) => t === "Bill",
    () => `I greet you, my creator!`,
    () => `Meh.`,
);

greet("Bill")
.subscribe(console.log); // Value{ value: "I greet you, my creator!" }
```

#### `tap`

`tap` returns a `Transform` that executes a function but ignores its output, returning its original input. This is a great way to debug:

```ts
pipe(
    (t: string) => t === "Bill" ? "Bill Barnes" : null,
    tap(console.log),
    t => t.repeat(2),
).("Bill")
.subscribe();
// Value{ value: "Bill Barnes" }
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

This works, but it isn't the *Prague* way. Rather than executing code immediately, we prefer to return `Action`s:

```ts
const bot = from((t: string) => {
    if (t === "current time")
        return () => console.log(`The time is ${new Date().toLocaleTimeString()}`);
    else if (t === "I'm hungry")
        return () => console.log(`You shoud eat some protein.`);
    else if (t === "Wassup")
        return () => console.log(`WAAAASSSUUUUUUP!`);
})
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

This is common enough that *Prague* provides a helper called `run`:

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
new Value("Bill", .5); // Value{ value: "Bill", score: .5 }
```

Scores are useful when the situation is ambiguous. Say our chatbot asks the user for their name. The user's response might be their name, or they might be ignoring your question and giving a command. How can you know for sure? Certain responses are more likely than others to mean "I am telling you my name". One strategy is to assign a score to each outcome, and choose the highest-scoring outcome. That's where scoring comes in.

In this example we'll first score two different potential responses to a request for a name, then we'll choose the highest scoring one. If there is one, we'll create an action with that score. Finally we'll put that against a differently scored action.

```ts
import { best } from 'prague';

const bot = best(
    match(
        best(
            pipe(
                (t: string) => /My name is (.*)/i.exec(t),
                matches => matches.value[1], // gets converted to a Value of score 1
            ),
            t => new Value(t, .5),
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
)(a).subscribe();

test("Bill"); // Nice to meet you, Bill
test("My name is Bill"); // Nice to meet you, Bill
test("current time"); // The time is 6:50:15 AM
test("My name is current time") // // Nice to meet you, Current Time
```

So far, so good. But consider this case:

```ts
const transforms = [
    () => new Value("hi", .75),
    () => new Value("hello", .75),
    () => new Value("aloha", .70),
    () => new Value("wassup", .65),
];

best(
    ...transforms
)()
.subscribe(console.log) // Value{ value: "hi", score: .75 }
```

Calling `best` can be unsatisfactory when there is a tie at the top. Things get even more challenging if you want to program in some wiggle room, say 5%, so that "aloha" becomes a third valid result.

It turns out that `best` is a special case of a helper called `sorted`, which returns a `Transform` which calls each supplied `Transform` with the supplied arguments. If none emit, neither does it. If one returns a `Result`, it returns that. If two or more return a `Result`, it returns a `Multiple`, which is a `Result` containing an array of all the `Result`s.

```ts
const sortme = sorted(
    ...transforms
);

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
.subscribe(console.log); // Multiple{ results:[ Value{ value: "hi", score: .75 }, Value{ value: "hello", score: .75 }, ] }
```

To include "aloha" we can add a tolerance of 5%:

```ts
pipe(
    sortme,
    top({
        tolerance: .05,
    }),
)()
.subscribe(console.log); // Multiple{ results:[ Value{ value: "hi", score: .75 }, Value{ value: "hello", score: .75 }, Value{ value: "aloha", score: .70 }, ] }
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
.subscribe(console.log); // Multiple{ results:[ Value{ value: "hi", score: .75 }, Value{ value: "hello", score: .75 }, Value{ value: "aloha", score: .70 }, ] }
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

#### `ActionReference` and `ActionReferences`

tk


### `Observable`s and `Promise`s

`Observable`s are a powerful and flexible approach to writing asynchronous code, but you don't have to go all the way down that rabbit hole to use *Prague*. All you need to knoe is that an `Observable` emits zero or more values, and then either throws an error or completes. *Prague* `Transforms` never emit more than one value, which will always be a `Result`.

#### Calling a `Transform`

```ts
fullName("Bill")
    .subscribe(
        result => {
            // handle result (if there is one) here
        },
        err => {
            // handle error here
        },
        () => {
            // this is called when there are no more results, whether one was emitted or not
        }
    )
```

#### Using `Promise`s instead

If you think this looks similar to writing resolve/reject handlers for a `Promise`, you're right. In fact, you can easily convert an `Observable` to a `Promise` as follows:

```ts
fullName("Bill")
    .toPromise() // returns a Promise<Result | undefined>
    .then(
        result  => {
            if (result === undefined) {
                // No result was emitted
            } else {
                // handle result
            }
        },
        err => {
            // handle error here
        },
    )
```

### NoResult

A quirk of `Observables` is that you don't automatically know if one emitted a value before completing:

```ts
fullName("Bill").subscribe(console.log); // Value{ value: "Bill Barnes" }
fullName("Yomi").subscribe(console.log); // <crickets>
```

You can force a transform to always emit *something* by wrapping it in `alwaysEmit` as follows:

```ts
import { NoResult, alwaysEmit } from 'prague';

const fullNameAlwaysEmits = alwaysEmit(fullName);

fullNameAlwaysEmits("Bill").subscribe(console.log); // Value{ value: "Bill Barnes" }
fullNameAlwaysEmits("Yomi").subscribe(console.log); // NoResult{}
```

This is especially useful for writing unit tests for `Transform`s.

(Another solution is to convert it to a `Promise` and check for an `undefined` result, as shown [above](#using-promises-instead).)

## Reference

tk

## Samples

Some miscelaneous [samples](samples/test.ts) exist, but mostly tk.
