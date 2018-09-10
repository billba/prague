# *Prague*

A library for using function programming concepts to more concisely and expressively code apps like games and chatbots. I thought of it as I walked around the city of Prague on a sunny Spring day. **This is not an official Microsoft project.**

Major features of Prague:
* strongly-typed when using [TypeScript](https://www.typescriptlang.org) (but you don't have to use TypeScript)
* deeply asynchronous via [RxJS](https://github.com/reactivex/rxjs) (but you don't have to use RxJS)
* utilizes and promotes functional programming (you do actually have to use functional programming, but you don't have to know anything about it to get started)

## Building *Prague*

* clone this repo
* `npm install`
* `npm run build` (or `npm run watch` to build on file changes)

## To add to your app
* `npm install prague`

## Tutorial

The *Prague* tutorial starts [here](./docs/1.tutorial.md).

## Samples

There is a simple chatbot sample [here](../samples/simpleBot.ts)

After building *Prague*, run it by

`node lib/samples/runSimpleBot.js`

