import { first, matchIf, match, re, ActionReferences } from '../src/prague';
import { Bot, BotRequest, BotResponse } from './consoleBot';

// `botState` holds state across conversational "turns" - a more sophisticated app
// might use something like Redux to manage a complex state machine.

interface BotState {
    open: boolean;
}

let botState: BotState = {
    open: true,
}

// `actions` contains all the actions the bot can take, including updating botState.

const actions = new ActionReferences((res: BotResponse) => ({
    oof() {
        res.send(`Sorry, we're closed for the day`);
    },
    greet(name: string) {
        res.send(`Nice to meet you, ${name}`);
    },
    bye() {
        res.send(`See you later!`);
        res.exit();
    },
    open() {
        res.send(`Open for business!`);
        botState.open = true;
    },
    close() {
        res.send(`Closing up.`);
        botState.open = false;
    },
    default() {
        res.send(`I didn't understand that.`);
    },
}));

// `getNameFromGreeting` is attempts to match the user input against several patterns, and extract a name
//
// `first` is a function which composes its function arguments into a new function. This new function applies
// its argument to each of the function arguments in sequence. If any of them returns a non-null result, it stops
// and returns that result. Otherwise it returns null.

// `re` wraps the `exec` method of the suppled regular expression, so it too is a function.
// Its optional second parameter indicates which capture group to return, otherwise it returns all of them.
//
// It takes a while for the brain to adjust to functions that return functions. It might be helpful to think
// of the above as follows, which is code that actually works, though less efficient: 
//
//  const getNameFromGreeting = (text: string) => first(
//     text => re(/My name is (.*)/i, 1)(text),
//     text => re(/Je m'appelle (.*)/i, 1)(text),
//     text => re(/Howdy y'all, I'm (.*)/i, 1)(text),
// )(text)

const getNameFromGreeting = first(
    re(/My name is (.+)/i, 1),
    re(/Je m'appelle (.+)/i, 1),
    re(/Howdy y'all, I'm (.+)/i, 1),
)

// `isFarewell`, `isOpenUp`, and `isCloseUp` are similar to `getNameFromGreeting`, They each only
// match one pattern, but if you want to add more later, you'd just wrap the `re` call in a `first`
// add more `re` calls.
//
// There's nothing special about `re`, it's just one pattern matching tool. You could replace isFarewell with:
//
// const isFarewell = (text: string) => text.includes('Goodbye');
//
// You could also replace each of these with function that makes an async call to an nlp service, and checks
// for a specific intent, or any other function that returns a truthy result.

const isFarewell = re(/Goodbye/i);

const isOpenUp = re(/Back to work/i);

const isCloseUp = re(/Gone fishing/i);

// Sometimes rules operate on user input, sometimes on application state, like `isOpen`

const isOpen = () => botState.open;

// `whenopen` uses `first` with the `match` and `matchIf` helpers to create a more sophisticated rule.
//
// `match` is a function which composes two or three function arguments into a new function.
// This new function calls the first function. If its result is non-null, it calls the second
// function with that result as its argument, and returns the result of that call, otherwise
// the third (or null if that's missing)
//
// `actions.reference.greet` returns an `ActionReference` pointing to the `bye` action above
//
// `matchIf` is very similar, but it interprets the result of the first function as a predicate. If it's
// truthy it returns the result of the second function, otherwise the third (or null if that's missing).

const whenOpen = first(
    match(getNameFromGreeting, actions.reference.greet),
    matchIf(isFarewell, actions.reference.bye),
    matchIf(isCloseUp, actions.reference.close),
);

// `whenClosed` works similarly to `whenOpen`. Notice that the second argument to `first` has no conditions.
// actions.reference.oof is acting as a default 'catch-all' case, giving an "out of office" message to almost
// all utterances

const whenClosed = first(
    match(isOpenUp, actions.reference.open),
    actions.reference.oof,
);

// `botLogic` is the top-level logic that decides what actions to take. It has a top-level
// "catch-all" rule, guaranteeing that it will always return an `ActionReference`.
//
// Because `botLogic` only returns a description of the action to take, it is perfect for testing.
// "../test/simpleBot.ts" contains tests for `botLogic`.

export const botLogic = (req: BotRequest) => first(
    matchIf(isOpen,
        () => whenOpen(req.text),
        () => whenClosed(req.text),
    ),
    actions.reference.default,
)();

// `bot` uses the `actions.run` helper to binds the `ActionReference` returned by `botLogic` to
// the actual function to run, and then runs that function.

export const bot: Bot = (req, res) => actions.run(botLogic, res)(req);
