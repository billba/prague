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
type Transform<ARGS extends any[], OUTPUT extends Result | null> = (...args: ARGS) => Observable<OUTPUT>;
```

A `Transform` function is called with arguments as normal. But instead of returning a result directly, it returns an object called an `Observable`. You subscribe to that object to get the result. If you're new to `Observable`s, you may want to read [Observables and Promises](#observables-and-promises), which has both a quick introduction to `Observable`s and also shows how to ignore them and just work with `Promise`s. 

A `Transform` emits either `null` or a subclass of `Result`.

### `Result`

`Result` is an abstract base class. The following subclasses of `Result` are included with *Prague*, and you can define your own.
* `Value<VALUE>` - contains a value of type VALUE
* `Action` - contains an action (function) to potentially execute at a future time
* `ActionReference` - contains the (serializable) name and arguments of a function to potentially execute at a future time
* `Scored<RESULT>` - contains a `Result` of type `RESULT` and its numeric score > 0 and <=1
* `Sourced<RESULT>` - contains a `Result` of type `RESULT` and a source
* `Multiple` - contains an array of `Result`s

### `from`

The `from` function allows you to write `Tranform`s more simply, by returning a value instead a `Value`, a function instead of an `Action`, `undefined` instead of `null`, or a `Promise` or a synchronous result instead of an `Observable`:

```ts
const repeat = from((a: string) => a.repeat(5))

const confirm = from((a: number) => () => console.log(`You picked ${a.toString()}`));

const getName = from((a: string) => fetch(`url/${a}`).then(r => r.json()).then(r => r.name));
```
are equivalent to:
```ts
const repeat = (a: string) => Rx.of(new Value(a.repeat(5)));

const confirm = (a: number) => Rx.of(new Action(() => console.log(`You picked ${a.toString()}`)));

const getName = (a: string) => Rx.from(fetch(`url/${a}`).then(r => r.json()).then(r => new Value(r.name)));
```

For your convenience, `from` is automatically called every place a `Transform` is expected. For example:
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

You can compose `Transform`s together into a new `Transform` using a variety of high-order functions included in *Prague*, or you can create your own.

#### `first`

`first` returns a new `Transform` which calls each of the supplied `Transform`s in turn. If one emits a `Result`, it stops and emits that. If all emit `null`, it emits `null`.

```ts
import { first } from 'prague';

const fullName = first(
    (t: string) => t === "Bill" ? "Bill Barnes" : null,
    t => t === "Hao" ? "Hao Luo" : null,
    t => t === "Kevin" ? "Kevin Leung" : null,
);

fullName("Bill").subscribe(console.log);    // Value{ value: "Bill Barnes" }
fullName("Hao").subscribe(console.log);     // Value{ value: "Hao Luo" }
fullName("Yomi").subscribe(console.log);    // null
```

Note that all the `Transform`s have the same argument types. However you only need to declare the argument types for the first `Transform`. TypeScript will use those for the rest, and for the resultant `Transform`, automatically. It will also complain if your `Transforms` have incompatibile argument types.

#### `pipe`

`pipe` returns a new `Transform` which calls each of the supplied `Transform`s in turn. You supply the arguments for the first. If it emits a `Result`, that becomes the argument for the second, and so on. If any of the `Transform`s emit `null`, the new `Transform` stops and emits `null`. Otherwise the new `Transform` emits the `Result` emitted by the last `Transform`.

```ts
import { pipe } from 'prague';

const someAssemblyRequired = pipe(
    (a: string, b: string) => a + b,
    fullName,
);

someAssemblyRequired("Kev", "in").subscribe(console.log);      // Value{ value: "Kevin Leung." }
someAssemblyRequired("Yo", "mi").subscribe(console.log);       // null
```

Note that you only need to declare the argument types for the first transform. TypeScript will infer the argument types for the rest (and for the resultant `Transform`) automatically.

#### `match`

`match(getValue, onValue, onNull)` returns a new `Transform` that calls `getValue`. If that emits a `Value`, it calls `onValue` with that value, and emits its output. If `getValue` emits `null`, `onNull` is called with no arguments, and the new `Transform` emits its output. If `onNull` is omitted, the new `Transform` emits `null` when `getValue` emits `null`.

```ts
import { match } from 'prague';

const greet = match(
    fullName,
    m => `Nice to meet you, ${m.value}.`,
    () => `I don't know you.`,
);

greet("Kevin").subscribe(console.log);     // Value{ value: "Nice to meet you, Kevin Leung." }
greet("Yomi").subscribe(console.log);      // Value{ value: "I don't know you." }
```

#### `matchIf`

`matchIf` is a special case of `match` for the common case of testing a "truthy" predicate.

```ts
import { matchIf } from 'prague';

const greet = matchIf(
    (t: string) => t === "Bill",
    () => `I greet you, my creator!`,
    () => `Meh.`,
);

greet("Bill").subscribe(console.log); // Value{ value: "I greet you, my creator!" }
greet("Yomi").subscribe(console.log); // Value{ value: "Meh." }
```

#### `tap`

`tap` returns a `Transform` that executes a function but ignores its output, returning the original input. This is a great way to debug:

```ts
pipe(
    (t: string) => t === "Bill" ? "Bill Barnes" : null,
    tap(console.log),
    t => t.repeat(2),
).("Bill")
.subscribe();
// Value{ value: "Bill Barnes" }
```

This is common enough that *Prague* provides a helper called `log` which is equivalent to `tap(console.log)`.

#### `Action`, `doAction`, and `run`

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

bot("Wassup").subscribe(); // WAAAASSSUUUUUUP
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
)("Wassup").subscribe(); // WAAAASSSUUUUUUP
```

*Prague* provides a helper called `doAction` for this specific *tap*:

```ts
pipe(
    bot,
    doAction,
)("Wassup").subscribe(); // WAAAASSSUUUUUUP
```

and a helper called `run` for this very common pattern:

```ts
run(bot)("Wassup").subscribe(); // WAAAASSSUUUUUUP
```

Obviously actions can do much more than `console.log`. This approach of waiting to executing side effects until you're done is a classic functional programming pattern, and makes for much more declarative code.

#### Regular Expressions: `re`

A common way to do pattern matching is regular expressions, as in the following:

```ts
const greet = match((text: string) => /My name is (.*)/i.exec(text),
    ({ value }) => `Nice to meet you, ${value[1]}`
);
```

The `exec` method of a `RegExp` happens to be a great fit for *Prague*, because it returns `null` when there are no matches. But this is fairly wordy, especially if your application includes lots of regular expression checks. *Prague* includes a more concise helper `re` that lets you rewrite the above as follows:

```ts
const greet = match(re(/My name is (.*)/i),
    ({ value }) => `Nice to meet you, ${value[1]}`
);
```

If you don't need capture groups you can use `re` with `matchIf`:

```ts
const greet = matchIf(re(/Hello|Howdy|Aloha|Wassup/i),
    () => `Yo`
);
```

#### Scoring: `Scored`, `best`, `Multiple`, `multiple`, `sort`, and `top`

Pattern matching isn't always black and white. That's where scoring comes in. A `Scored` couples a `Result` with a numeric score between 0 and 1:

```ts
import { Scored } from 'prague';

const iffyBill = new Scored(new Value("Bill"), .5);         // Scored{ result: Value{ value: "Bill" }, score: .5 }
const definitelyBill = new Scored(new Value("Bill"), 1);    // Scored{ result: Value{ value: "Bill" }, score: 1 }
```

`iffyBill` can be interpreted as *a 50% chance that the correct value is 'Bill'*.

Any `Result` can be wrapped in a `Scored`, but typically a `Scored` shouldn't be wrapped in another `Scored`. To make this easier to ensure, we use the `Scored.from` factory method instead of `new Scored`. It wraps or rewraps results as appropriate, is careful not to create new objects unnecessarily, normalizes scoring, allows `Value` and `Action` shorthands, and returns `null` for `null`, `undefined`, and scores of zero.

```ts
const iffyBill = Scored.from(new Value("Bill"), .5);    // Scored{ result: Value{ value: "Bill" }, score: .5 }
const iffyBill = Scored.from("Bill", .5);               // Scored{ result: Value{ value: "Bill" }, score: .5 }
const lessIffyBill = Scored.from(iffyBill, .75);        // Scored{ result: Value{ value: "Bill" }, score: .75 }
const equallyIffyBill = Scored.from(iffyBill, .5);      // returns iffyBill, i.e. equallyIffyBill === iffyBill
const equallyIffyBill = Scored.from(iffyBill);          // returns iffyBill, i.e. equallyIffyBill === iffyBill
const definitelyBill = Scored.from("Bill");             // Scored{ result: Value{ value: "Bill" }, score: 1 }
const returnsNull = Scored.from(null);                  // null
const returnsNull = Scored.from("Bill", 0);             // null
```

Scoring is usually a temporary operation - you wrap `Result`s in scores to determine the highest one(s). To unwrap them call `Scored.unwrap`, which will return the wrapped `Result` for any `Scored` and pass through any other `Result`s.

```ts
Scored.unwrap(iffyBill);            // Value{ value: "Bill" }
Scored.unwrap(new Value("Bill"));   // Value{ value: "Bill" }
```

Let's see scoring in action. Say our chatbot asks the user for their name. The user's response might be their name, or they might be ignoring your question and giving a command. How can you know for sure? Certain responses are more likely than others to mean "I am telling you my name". One strategy is to assign a score to each outcome, and choose the highest-scoring outcome. That's where scoring comes in.

In this example we'll always assign a score of 1 to a name gleaned from an unambiguously verbose introduction. Otherwise, if there is an outstanding question (the bot asked the user's name) we'll assign a 50% chance that the entire user's response is a name. In either case we transform that `Scored Value` into a `Scored Action` with the same score, greeting the user.

Meanwhile we have a different rule that is looking for the phrase "current time". If there are no outstanding questions we assign its action a score of 1, but even if there is an outstanding question we consider that there's a pretty good chance that this phrase represents a command, so we assign it a score of .75.

We pass both these transforms to `best`, which returns a new transform which calls *all* of the transforms, collects the `Scored<Result>`s thereof, and returns the unwrapped `Result` of the highest scoring one. (If any of the transforms return a non-`Scored` `Result`, `best` will automatically wrap it in a `Scored` with score 1).

```ts
import { best } from 'prague';

const bot = best(
    match(
        first(
            match(
                re(/My name is (.*)/i),
                ({ value }) => Scored.from(value[1]),
            ),
            t => botstate.question === 'name' ? Scored.from(t, .5) : null,
        ),
        scoredValue => Scored.from(
            () => console.log(`Nice to meet you, ${scoredValue.result.value}`),
            scoredValue.score
        ),
    ),
    matchIf(
        re(/current time/),
        () => Scored.from(
            () => console.log(`The time is ${new Date().toLocaleTimeString()}`),
            botstate.question ? .75 : 1
        )
    ),
);

const test = (a: string) => run(
    bot,
)(a).subscribe();

// When botstate.question === 'name'
test("Bill");                   // Nice to meet you, Bill
test("My name is Bill");        // Nice to meet you, Bill
test("current time");           // The time is 6:50:15 AM
test("My name is current time") // Nice to meet you, Current Time

// When botstate.question is undefined
test("Bill");                   // 
test("My name is Bill");        // Nice to meet you, Bill
test("current time");           // The time is 6:50:15 AM
test("My name is current time") // Nice to meet you, Current Time
```

So far, so good. But consider this case:

```ts
const values = [
    Scored.from("hi", .75),
    Scored.from("hello", .75),
    Scored.from("aloha", .70),
    Scored.from("wassup", .65),
];

const valueTransforms = values.map(value => () => value);

best(
    ...valueTransforms
)().subscribe(console.log) // Value{ value: "hi", score: .75 }
```

Calling `best` can be unsatisfactory when there is a tie at the top. Things get even more challenging if you want to program in some wiggle room, say 5%, so that "aloha" becomes a third valid result.

The first thing we need is a way to work with more than one `Result`. Enter `Multiple`, a `Result` containing an array of `Result`s. You can either create one directly:

```ts
new Multiple(values);
```

Or you can use the `multiple` helper to create a `Transform` which calls each supplied `Transform`. If none emits a `Result`, it returns `null`. If one returns a `Result`, it returns that. If two or more return `Result`s, it returns a `Multiple` containing them.

```ts
multiple(valueTransforms);
```

Frequently the thing you want to do with multiple results is to sort them:

```ts
const sortme = pipe(
    multiple(valueTransforms),
    sort(),
)
```

The result of all this is a `Transform` which returns a `Multiple` which contains a sorted array of `Value`s.

We can narrow down this result using a helper called `top`.

To retrieve just the high scoring result(s):

```ts
pipe(
    sortme,
    top(),
)().subscribe(console.log); // Multiple{ results:[ Value{ value: "hi", score: .75 }, Value{ value: "hello", score: .75 }, ] }
```

To include "aloha" we can add a `tolerance` of 5%:

```ts
pipe(
    sortme,
    top({
        tolerance: .05,
    }),
)().subscribe(console.log); // Multiple{ results:[ Value{ value: "hi", score: .75 }, Value{ value: "hello", score: .75 }, Value{ value: "aloha", score: .70 }, ] }
```

We can set a `tolerance` of 1 (include all the results) but set the maximum results to 3. This will have the same effect as the above:

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

Increasing `tolerance` includes more items in the "high score". It defaults to `0` and has a maximum value of `1`.

Decreasing `maxResults` limits of the number of "high score" results retrieved. It defaults to `Number.POSITIVE_INFINITY` and has a minimum value of `1`.

Now that you understand `multiple`, `sort`, and `top`, we can reveal that `best` is just a special case of using them all together, with an `unwrap` at the end:

```ts
const best = (...transforms) => pipe(
    multiple(...transforms),
    sort(),
    top({
        maxResults: 1,
    }),
    Scored.unrwap,
);
```

**Note**: `top` is just one way to narrow down multiple results. There are many heuristics you may choose to apply. You may even ask for human intervention. For instance, in a chatbot you may wish to ask the user to do the disambiguation ("Are you asking the time, or telling me your name?"). Of course their reply to that may also be ambiguous...

#### `ActionReference` and `ActionReferences`

tk


### `Observable`s and `Promise`s

`Observable`s are a powerful and flexible approach to writing asynchronous code, but you don't have to go all the way down that rabbit hole to use *Prague*. All you need to know is that an `Observable` emits zero or more values, and then either emits an error or completes. *Prague* `Transforms` either emits an error or emits one `Result` and completes.

#### Calling a `Transform`

```ts
fullName("Bill")
    .subscribe(
        result => {
            // handle result here
        },
        err => {
            // handle error here
        },
    )
```

#### Using `Promise`s instead

If you think this looks similar to writing resolve/reject handlers for a `Promise`, you're right. In fact, you can easily convert an `Observable` to a `Promise` as follows:

```ts
fullName("Bill")
    .toPromise() // returns a Promise<Value<string> | null>
    .then(
        result  => {
            // handle result here
        },
        err => {
            // handle error here
        },
    )
```

## Reference

tk

## Samples

tk
