# Observables in *Prague*

Before learning more about *Prague* we need to pause for a brief primer on `Observable`s, a powerful and flexible approach to writing asynchronous code. The good news is that you don't have to know very much about them to use *Prague*. It's enough to know that a *Prague* `Transform` either emits an error or emits one `Result` and completes.

## Calling an `Observable`

```ts
transform
    .subscribe(
        result => {
            // OPTIONAL: handle result here
        },
        err => {
            // OPTIONAL: handle error here
        },
    )
```

## Using `Promise`s instead

If you think this looks similar to writing resolve/reject handlers for a `Promise`, you're right. In fact, you can easily convert an `Observable` to a `Promise` as follows:

```ts
transform
    .toPromise()
    .then(
        result  => {
            // handle result here
        },
        err => {
            // handle error here
        },
    )
```

In succeeding examples you can replace `subscribe` with `toPromise().then`. And that's all you need to know about `Observable`s!

## Async in *Prague*

The typical *Prague* app is composed of a lot of smaller functions. You can mix together functions that return synchronously with functions that return a `Promise` with functions that return an `Observable`. *Prague* will ultimately combine them all into one function that returns an `Observable`.

## Conclusion

In this chapter we learned how *Prague* uses `Observable`s to return results, and that it allows a mix of synchronous and asynchronous functions.

## Next

In the [next chapter](./combining.md) we'll see other advantages to structuring your application to return a result instead of taking an action directly.
