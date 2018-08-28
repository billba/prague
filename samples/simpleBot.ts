import { first, matchIf, match, re, ActionReferences, pipe, ActionReference, sorted, Multiple, Value } from '../src/prague';
import { Bot, BotRequest, BotResponse } from './consoleBot';

interface BotState {
    open: boolean;
}

let botState: BotState = {
    open: true,
}

const actions = new ActionReferences((res: BotResponse) => ({
    oof: () => res.send(`Sorry, we're closed for the day`),
    greet: (name: string) => res.send(`Nice to meet you, ${name}`),
    bye: () => {
        res.send(`See you later!`);
        res.exit();
    },
    open: () => {
        res.send(`Open for business!`);
        botState.open = true;
    },
    close: () => {
        res.send(`Closing up.`);
        botState.open = false;
    },
    default: () => res.send(`I didn't understand that.`),
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

// _bot is the testable logic, returns ActionReferences

export const _bot = (req: BotRequest) => first(
    matchIf(isOpen,
        () => whenOpen(req.text),
        () => whenClosed(req.text),
    ),
    () => actions.reference.default(),
)();

// bot does things

export const bot: Bot = (req, res) => actions.run(_bot, res)(req);
