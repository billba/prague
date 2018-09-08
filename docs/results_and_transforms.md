# `Result`s and `Transform`s

In our [first chapter](./testable_bots.md) we rewrote our app from an imperative style to a functional style, returning an `ActionReference` which describes the action to take instead of taking the action directly.

In our [second chapter](./observables.md) we learned that *Prague* runs on `Observable`s, but that it allows you to mix synchronous functions with those that return `Promise`s with those that return `Observable`s.

In this chapter we'll learn about the two interrelated fundamental types of *Prague*, `Result`s and `Transform`s.

# Value

Let's look into 

```ts
const 
```

A `Transform` is a function that returns an `Observable` of either `null` or a subclass of `Result`.

