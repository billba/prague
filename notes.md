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

BIG IDEA: Recognizers compose.

So instead a context being { query, [{recognizer, handler}]}

We should instead have just { query, rule: {recognizer, handler} }

But we can introduce a new recognizer:

rules(rule, rule, rule, ...)

which returns a single rule, a new recognizer which loops through the others until one succeeds, then calls its handler.

Similarly, we can now easily add:

scorable(rule, rule, rule, ...) where each of the recognizers returns <Args extends Scorable>, which is to say that it one of its args is { score: number }. Scorable runs them all and then returns the highest one (or first past the post, or whatever).

The idea is that anyone can write these.

---

BIG IDEA: There are operators on recognizers

context(query, {recognizer, handler}) => {and(query, recognizer), handler}

serial({recognize0, handler0}, {recognizer1, handler1}) => {serial(recognizer0, recognizer1), handler of the first recognizer that wins}

best({recognize0, handler0}, {recognizer1, handler1}) => {best(recognizer0, recognizer1), handler of the recognizer that wins}

parallel({recognize0, handler0}, {recognizer1, handler1}) => {parallel(recognizer0, recognizer1), handler of the first recognizer that responds & wins}

The big idea here is that operators don't resolve the handler, which is good because an operator doesn't know if it's going to be called by others.

So the engine runs recursively through operators, holding the resultant handlers until the "winning" recognizer is determined, at which point the handler is resolved.