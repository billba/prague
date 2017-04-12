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

You may handle chat events however you want. The following is a suggestion: drive your bot via state, using the Redux model.
* Testable
* Debuggable (save a history of state and set it to an arbitrary point to debug)
* Reason about chat-specific state in tandem with other app state

So here's how this all plays out:

When a message is received from chat:
1. Using state, decide how to interpret the intent. e.g. could be a question or an answer to a question
2. As necessary, update the state to reflect this interpretation using store.dispatch()
3. If there is any further actions required (a response, an API call), take it now in an epic or chain of epics, making sure to update the state at each stage

When a different event happens (e.g. timer goes off):
1. Using state, decide how to handle the event
2. Update the state to reflect this interpretation using store.dispatch()
3. If there is any further actions required (a response, an API call), take it now in an epic or chain of epics, making sure to update the state at each stage

In other words, chat messages are no different than any other event.

This mechanism is only necessary if state ends up needing to change. If an event just requires a simple response, go ahead and respond.

Why do we need epics at all?

1. To bind an initial dispatch with an async event that follows it.



---

Current issue: Redux assumes everything is always initialized, but of course that's not true for new users because we don't know they exist. So we need a good place to "notice" that there's a new user so that we can call store.dispatch('new_user)).

A thing I'm toying with: send botData to query and recognizer, because it's ever so convenient. But it really ties this engine to a very specific implementation of state. Sigh.

New idea: a general-purpose helper for a given implementation.

something like 

mySessionFn = <Session>(message) => Session;

interface Session<State> {
    ...
}

* runMessage(mySessionFn, message) => { session = mySessionFn(message) }
* accesses the store
* creates user if there isn't already one
* aggregates useful stuff, like the current message, address, state, botdata, store dispatcher (but maybe not store?)
* passed as **optional** param to query, recognizer, and helper
* basically Steve's session idea, but extensible
* you, the person writing helpers, define the type of session

query(session) > recognizer(session) > handler(session, args)