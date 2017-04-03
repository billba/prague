My new definition of "bot" is an app that listens to events from various channels, updates state, and takes actions as it sees fit. In other words, it's a general-purpose app.

Examples of events are:
* A user on a website submits a form
* A user on a chat channel sends a message
* A timer goes off
* An API call yields a response
* A webhook is pinged

Examples of actions are:
* Call an API
* Send one or more messages to one or more chat channel

Note that this is not primarily a request-response model. A message user on one chat channel may trigger multiple messages
to multiple users on other chat channels, or push a change to everyone on a website. That said, it should be straightforward
to code up a simple request-reponse model.

Chats are not priviledged in any way. You don't need to use them at all. But if you want to, here's how:
* Set up your own native (e.g. Facebook) endpoints and use them as you see fit
* Or abstract a given channel as a Chat Connector, yielding a common activity format and send/receive API
* You may conveniently combine multiple Chat Connectors into a single event stream
