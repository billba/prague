# *Prague*

A library for using function programming concepts to more concisely and expressively code in apps like games and chatbots. I thought of it as I walked around the city of Prague on a sunny Spring day. **This is not an official Microsoft project.**

Major features of Prague:
* strongly-typed when using [TypeScript](https://www.typescriptlang.org) (but you don't have to use TypeScript)
* flexibly asynchronous - mix functions that return Promises with functions that don't
* utilizes and promotes functional programming (you do actually have to use functional programming, but you don't have to know anything about it to get started)

## Building *Prague*

* clone this repo
* `npm install`
* `npm run build` (or `npm run watch` to build on file changes)

## To add to your app
* `npm install prague`

## Tutorial

The *Prague* tutorial starts [here](./docs/1.testable_bots.md).

## Samples

There is a simple chatbot sample [here](./samples/simpleBot.ts)

After building *Prague*, run it by `node lib/samples/runSimpleBot.js`

