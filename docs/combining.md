# Combining Functions with *Prague*

In our previous chapters we refactored a chatbot into logic that returns which action to run, and the actual actions. We also learned that *Prague* functions can return either a result, a `Promise` of a result, or an `Observable` of a result.

In this chapter we'll add a new scenario to our chatbot, and learn how to use *Prague* to elimininate up a lot of repetitive code, making our remaining code more expressive and future-proof.

## A recipe... for success!

Let's consider a new scenario for our chatbot:

```
if a user asks for a recipe
    if they provided a recipe name
        look it up
        if we find it
            return a "show recipe" action reference
        else
            return a "coudln't find recipe" action reference
    else
        tell them they need to provide a name
```

We will make use of an NLP service to interpret the user's utterance, and a recipe service to retrieve the recipe:

```ts
GET `https://nlpService/${modelId}?q=${text}` => {
    intents: {
        name: string,
        score: number
    }[], // sorted by score descending. Always exists, may be empty array.
    entities: {
        name: string,
        value: string,
        score: number
    }[] // sorted by score descending. Always exists, may be empty array.
} (always returns OK unless model is invalid or there is a server error)

GET `https://recipeService?q=${name}` => {
    recipes: {
        name: string;
        ingredients: string[],
        instructions: string[]
    }[] // Always exists, may be empty array.
} (always returns OK unless there is a server error)
```

We'll add three new actions, a model ID, and a function that returns either `null` or an `ActionReference`.

```ts
const actions = new ActionReferences({
    // all the existing functions plus:
    showRecipe(recipe) { ... },
    noSuchRecipe(name) { ... },
    missingReceipeName() { ... },
 });

const modelId = "XXXX_YYYY_ZZZZ";

const recipe = async text => {
    let response = await fetch(`https://nlpService/${modelId}?q=${text}`);
    if (!response.ok)
        throw `NLP error with model ${modelId}`);
    
    const nlpResponse = await response.json();

    if (nlpResponse.intents.length === 0 || nlpResponse.intents[0].name !== "getRecipe")
        return null;
    
    const recipeName = r.entities.find(recipe => recipe.name === "recipeName");
    if (!recipeName)
        return actions.reference.missingRecipeName();

    response = await fetch(`https://recipeService?q=${recipeName}`);
    if (!response.ok)
        throw `NLP error with model ${modelId}`);
    
    const recipeResponse = await response.json();

    return recipeResponse.recipes.length === 0
        ? actions.reference.noSuchRecipe(recipeName);
        : actions.reference.showRecipe(recipeResponse.recipes[0]);
}
```

*Prague* includes a helper called `getFetchJson` which cleans up the `fetch` logic:

```ts
const recipe = text => {
    let nlpResponse = await fetch(`https://nlpService/${modelId}?q=${text}`)
        .then(getFetchJson(`NLP error with model ${modelId}`));

    if (nlpResponse.intents.length === 0 || nlpResponse.intents[0].name !== "getRecipe")
        return null;
    
    const recipeName = r.entities.find(recipe => recipe.name === "recipeName");
    if (!recipeName)
        return actions.reference.missingRecipeName();

    let recipeResponse = await fetch(`https://recipeService?q=${recipeName}`)
        .then(getFetchJson(`recipeService error`));

    return recipeResponse.recipes.length === 0
        ? actions.reference.noSuchRecipe(recipeName);
        : actions.reference.showRecipe(recipeResponse.recipes[0]);
}
```

Now let's add this function to our existing `botLogic`:

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

    r = await recipe(req.text);
    if (r)
        return r;
    // etc.

    return null;
}
```

## Cleaning up code with *Prague*

*Prague* is designed to clean up repetitive logic like this. Let's introduce the `first` function:

```ts
const botLogic = req => first(
    text => {
        let r = /delete (.*)/i.exec(req.text);

        if (r)
            return getFile(r[1])
                ? actions.reference.delete(r[1])
                : actions.reference.delete_fail(r[1]);
    },
    text => {
        let r = /cured/i.exec(req.text);

        if (r)
            return actions.reference.jerky();
    },
    text => {
        let r = /is my (.*) cured/i.exec(req.text);

        if (r)
            return actions.reference.healthStatus(r[1]);
    },
    async text => {
        let r = await recipe(text);

        if (r)
            return r;
    }

    // etc.

)(req.text);
```

`first` is a *higher-order function*, which is to say that it takes functions as arguments and returns a new function. This new function takes its own set of arguments and calls each function argument in order, with those arguments. If that function retuns a result other than `null` (or `undefined`), it returns that result. Otherwise it tries the next function. If all of the functions return `null`, it does too.

Like all *Prague* functions, the functions that `first` takes as arguments can return either a result, a `Promise` of a result, or an `Observable` or a result, which is why that last argument can be an `async` function.

## Eliminating repetition

This new version of `botLogic` is just as repetitive as what we started with. Let's fix that.

Conveniently, `recipe` returns `null` when the text doesn't match, so we can replace:

```ts
    async text => {
        let r = await recipe(text);

        if (r)
            return r;
    }
```

with:

```ts
    text => recipe(text),
```

and that can be simplified further to:

```ts
    recipe,
```

The other tests come down to the pattern *if this function returns a result, transform that result into a different result and return that, otherwise return something else*. *Prague* has a function called `match` for this common pattern. We'll replace:

```ts
    text => {
        let r = /delete (.*)/i.exec(req.text);

        if (r)
            return getFile(r[1])
                ? actions.reference.delete(r[1])
                : actions.reference.delete_fail(r[1]);
    },
```

with:

```ts
    text => match(
        text => /delete (.*)/i.exec(text),
        matches => actions.reference.delete(matches[1]),
        () => actions.reference.delete_fail(r[1])
    )(text),
```

`match` takes three functions which we'll call `getResult`, `onResult`, `onNull`, and returns a new function. This new function takes its own arguments and calls `getResult` with them. If the result is `null` it calls `onNull` and returns that result. Otherwise it calls `onResult` with `getResult`'s result, and returns *that* result.

We can further simplified this to:

```ts
    match(
        text => /delete (.*)/i.exec(text),
        matches => actions.reference.delete(matches[1]),
        () => actions.reference.delete_fail(r[1])
    ),
```

Unfortunately we can't simplify `text => /foo/.exec(text)` to `/foo/.exec` because JavaScript, so *Prague* supplies a helper called `re` to eliminate just that last bit of duplication:

```ts
    match(
        re(/delete (.*)/i),
        matches => actions.reference.delete(matches[1]),
        () => actions.reference.delete_fail(r[1])
    ),
```

If you omit the `onNull` argument, `match` will just return `null` when `getResult` returns `null`.

With all that, we can greatly simplify `botLogic`:

```ts
const botLogic = req => first(
    match(
        re(/delete (.*)/i),
        matches => actions.reference.delete(matches[1]),
        () => actions.reference.delete_fail(r[1])
    },
    match(
        re(/cured/i),
        () => actions.reference.jerky()
    },
    match(
        re(/is my (.*) cured/i),
        matches => actions.reference.healthStatus(matches[1])
    },
    recipe,

    // etc.

)(req.text);
```

Eliminating all the repetitive code makes `botLogic` shorter. More importantly, it's also more expressive. ***Prague* code looks almost like a declarative markup language.**

## When not to use *Prague*

Now let's return to our `recipe` function. Could it be recoded with *Prague*?

Well... you *could*. Using two more *Prague* functions `pipe` and `onlyContinueIf` we end up with:

```ts
const recipe = pipe(
    text => fetch(`https://nlpService/${modelId}?q=${text}`),
    getFetchJson(`NLP error with model ${modelId}`),

    onlyContinueIf(nlpResponse => nlpResponse.intents.length === 0 || nlpResponse.intents[0].name !== "getRecipe"),

    match(
        nlpResponse => r.entities.find(recipe => recipe.name === "recipeName"),
        recipeName => match(
            pipe(
                () => fetch(`https://recipeService?q=${recipeName}`),
                getFetchJson(`recipeService error`)
            ),
            recipeResponse => actions.reference.showRecipe(recipeResponse.recipes[0]),
            () => actions.reference.noSuchRecipe(recipeName)
        )(),
        () => actions.reference.missingRecipeName()
    )
)
```

In this case even an experienced *Prague*rammer might conclude that the original was clearer. Use the right tool for the job. *Prague* is not meant to replace all your JavaScript logic. You will quickly gain a sense for when *Prague* makes your code clearer, and when it makes it more opaque. A good rule of thumb is that *Prague* is helpful when your code seems unecessarily verbose and repetitive.

But since we went to the effort, let's at least see how this code works.

`pipe` takes as arguments a sequence of functions, and returns a new function. This new function calls each supplied function in order. Its arguments become the arguments to the first function. The result of the first becomes the argument of the second, and so on. If any returns `null` then the new function immediately returns `null`, otherwise it returns the result of the last function. The idea of `pipe` is a series of transforms that fails as soon as one of the transforms fail. In fact, we call *Prague* functions `Transform`s.

You may be wondering where the `text` argument to `recipe` went. Remember that `pipe(...)` returns a function. The argument to that function is the argument to the first transform, which is `text`.

Then we transform the response of `fetch` using `getFetchJson`.

`onlyContinueIf` takes a predicate as an argument and returns a new function which evaluates that predicate with its argument. If the predicate is "truthy" it returns its result, otherwise it returns `null`. `onlyContinueIf` is used as a quick way to short circuit a `pipe` if a condition is not met. In this case we're bailing out early if our NLP service doesn't think the user is asking for a recipe.

You already know about `match`, though in this case we nest two `match`es. The `getResult` function for the second one is the `pipe`d combination of calling `fetch` and `getFetchJson`.

## *Prague* and `botLogic`

The *Prague*matic `botLogic` is functionally equivalent to the old one in every respect but one: the old one returned a `Promise`, while the new one returns an `Observable`. Our previous `bot` looks like this:

```ts
const bot = (req, res) => botLogic(req).then(actions.doAction(res));
```

But that won't work anymore. We could to change it to:
```ts
const bot = (req, res) => botLogic(req).subscribe(actions.doAction(res));
```

But it would be more *Prague*matic to see `doAction` as a final transformation:

```ts
const bot = (req, res) => pipe(
    botLogic(req),
    actions.doAction(res)
).subscribe()
```

Finally, most *Prague* apps will look like this, so `ActionReferences` provides a helper:

```ts
const bot = (req, res) => actions.run(
    botLogic(req),
    res
).subscribe()
```

## Coding for the future

As it stands, `botLogic` is a little confining in how it handles pattern matching.

Remember when we said "[`jerkyService` and/or `healthService` might provide their own pattern matching API calls](./testable_bots.md#the-problem-with-testing-bot-output)?" Intuitively we *want* to replace:

```ts
    match(
        re(/is my (.*) cured/i),
        matches => actions.reference.healthStatus(matches[1])
    },
```

with:

```ts
    match(
        jerkyService.nlp,
        matches => actions.reference.healthStatus(matches[1])
    },
```

... but we can't.

The problem is not that `jerkyService.nlp` is an async service -- *Prague* handles that beautifully.

The problem is that `re(...)` returns a very different result than `jerkyService.nlp`. But ultimately what we want to extract from both of them is either `null` or the name of the condition.

If we get a little more verbose in the first place, we can isolate the implementation of the pattern matching:

```ts
    match(
        pipe(
            re(/is my (.*) cured/i),
            matches => matches[1]
        ),
        condition => actions.reference.healthStatus(condition)
    },
```

Now if we want to drop in the service version only the `getResult` part changes:

```ts
    match(
        pipe(
            jerkyService.nlp,
            nlpResponse => r.intents.find(intent => intent.name === 'status') && r.entities.find(entity => entity.name === 'condition')
        ),
        condition => actions.reference.healthStatus(condition)
    },
```

With this in mind, let's use `pipe` to whip up a couple of helpers to make our code more future-proof:

```ts
const reGroup = (regexp, group) => pipe(
    re(regexp),
    matches => matches[group]
);

const nlp = (service, intentName, entityName) => text => pipe(
    service.nlp(text),
    r.intents.find(intent => intent.name === intentName) && (!entityName || r.entities.find(entity => entity.name === entityName))
);

const botLogic = req => first(
    match(
        reGroup(/delete (.*)/i, 1),
        matches => actions.reference.delete(matches[1]),
        () => actions.reference.delete_fail(r[1])
    },
    match(
        re(/cured/i), // or replace with nlp(jerkyService, 'status')
        () => actions.reference.jerky()
    },
    match(
        reGroup(/is my (.*) cured/i, 1), // or replace with nlp(healthService, 'status', 'condition')
        condition => actions.reference.healthStatus(condition)
    },
    recipe,

    // etc.

)(req.text);
```

## Errors and Prague

Calling a *Prague* `Transform` has three potential outcomes:
* It can return a result
* It can return `null`, usually interpreted as "this `Transform` didn't apply"
* It can throw an exception

It's important to distinguish the last two. `null` is not pejorative. Nothing unexpected happened and nothing "failed". The `Transform` simply didn't apply. You can see this in action in `recipe` - it returns `null` to indicate that the user wasn't asking for a recipe. On the other hand, if either of our `fetch` calls fail, it throws an exception, which you can handle in `subscribe`

```ts
const bot = (req, res) => actions.run(
    botLogic(req),
    res
).subscribe(
    null,
    err => { 
        console.log("Exception", err);
    }

)
```

(Thinking about `recipe`, a more user-friendly approach would probably be to return an action letting the user know that there was an unexpected error. This exercise is left for the reader).

## Conclusion

In this chapter we added a new scenario to our chatbot, and learned how to use *Prague* to elimininate up a lot of repetitive code, making our remaining code more expressive and future-proof.

## Next

In the [next chapter](./scoring.md) we'll learn about dealing with multiple ambiguous matches with scoring.
