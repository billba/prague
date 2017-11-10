# Prague

An experimental rule system handy for intepreting user input, great for adding conversational features to apps, using lessons learned from the [message router](http://www.enterpriseintegrationpatterns.com/patterns/messaging/MessageRoutingIntro.html) pattern. I thought of it as I walked around Prague on a sunny Spring day. **This is just an experiment and not an official Microsoft project.**

Major features of Prague:
* strongly-typed rules engine for interpreting ambiguous input of all kinds
* support for different types of applications through fine-grained interfaces rather than high-level abstraction
* deeply asynchronous via RxJS

Some types of applications you could build with Prague:
* OS shell
* Browser app w/chat interface
* Browser app w/voice interface
* Slack bot (native interface)
* Multi-platform Chat bot
* Server-rendered Website w/pop-up chat

## Building Prague

* clone or fork this repo
* `npm install`
* `npm run build` (or `npm run watch` to build on file changes)

## Prague recipes

Prague is a low-level framework. If you want to build an app you will want to use (or create) a `recipe`, which is a set of functionality that allows you to exchange messages with a given channel, using a given state store, etc.

As recipes emerge they will be posted here.

## Prague samples

TBD

# Tutorial

TBD
