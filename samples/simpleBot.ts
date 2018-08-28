import { first, matchIf, match, re, ActionReferences, pipe } from '../src/prague';
import { BotContext } from './consoleBot';

interface BotState {
    open: boolean;
}

let botState: BotState = {
    open: true,
}

const actions = new ActionReferences((context: BotContext) => ({
    oof: () => context.send(`Sorry, we're closed for the day`),
    greet: (name: string) => context.send(`Nice to meet you, ${name}`),
    bye: () => {
        context.send(`See you later!`);
        context.exit();
    },
    open: () => {
        context.send(`Open for business!`);
        botState.open = true;
    },
    close: () => {
        context.send(`Closing up.`);
        botState.open = false;
    },
    default: () => context.send(`I didn't understand that.`),
}));

const getNameFromGreeting = pipe(
    first(
        re(/My name is (.*)/i),
        re(/Je m'appelle (.*)/i),
        re(/Howdy y'all, I'm (.*)/i),
    ),
    ({ value }) => value[1],
)

const isFarewell = first(
    re(/Goodbye/i),
)

const isOpenUp = first(
    re(/Back to work/i),
)

const isCloseUp = first(
    re(/Gone fishing/i),
)

const isOpen = () => botState.open;

const whenOpen = first(
    match(getNameFromGreeting, ({ value }) => actions.reference.greet(value)),
    matchIf(isFarewell, () => actions.reference.bye()),
    matchIf(isCloseUp, () => actions.reference.close()),
);

const whenClosed = first(
    match(isOpenUp, () => actions.reference.open()),
    () => actions.reference.oof(),
);

export const _bot = (context: BotContext) => first(
    matchIf(isOpen,
        () => whenOpen(context.text),
        () => whenClosed(context.text),
    ),
    () => actions.reference.default(),
)();

export const bot = (context: BotContext) => actions.run(_bot, context)(context);
