# Prague

An experimental rule system handy for intepreting user input, great for adding conversational features to apps. I thought of it as I walked around Prague on a sunny Spring day. **This is not an official Microsoft project.**

Major features of Prague:
* strongly-typed when using TypeScript
* deeply asynchronous via RxJS

Some types of applications you could build with Prague:
* OS shell
* Chat bot
* Games

## Building Prague

* clone or fork this repo
* `cd recipes\fluent`
* `npm install`
* `npm run build` (or `npm run watch` to build on file changes)

## To add to your app
`npm install prague`

# A guide to Prague

## A note about terminology: Routes and Routers

Past versions of Prague were based on the [network message router](http://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageRoutingIntro.html) pattern. Messages were *routed* through rules, resulting in a *route*. As Prague has evolved (or *pragueressed*, if you will), the message has disappeared as a first class object, and so Router and Route are legacy terminology. I am *extremely open* to suggestions for replacements.

## Overview

A *Router* is a rule in the form of a function that produces an output called a *Route*.

## Routes

There are several types of Routes:

### No

A *NoRoute* is the failure output of a rule.

### Do

A *DoRoute* contains asynchronous code to run (**do$** or **do**, depending if you prefer Observables or Promises).

The ultimate goal of a Prague rule system is either a *DoRoute* (run some code) or a *NoRoute* (don't do anything).

### Match

A *MatchRoute* contains information extracted out of the system, such as an intent and/or entities. It contains a typed **value** such as a string or an array of entities, and a **score**, which is a floating-point number between 0 and 1 representing confidence in this information.

A MatchRoute is not an end into itself. 

### Template

A *TemplateRoute* contains a schemetized *description* of code to run, in the form **action** (name of action) and **args** (arguments to that function). The **Templates** class allows you to define a dictionary of such actions.


