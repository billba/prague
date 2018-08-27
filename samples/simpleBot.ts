import { first, matchIf, match, re, ActionReferences, pipe } from '../src/prague';
import { BotContext, consoleBot } from './consoleBot';

const actions = new ActionReferences((context: BotContext) => ({
    oof: () => console.log(`Sorry, we're closed for the day`),
    greet: (name: string) => console.log(`Nice to meet you, ${name}`),
    bye: () => {
        console.log(`See you later!`);
        context.exit();
    },
    default: () => console.log(`I didn't understand that.`),
}));

const greeting = first(
    re(/My name is (.*)/i),
    re(/Je m'appelle (.*)/i),
    re(/Howdy y'all, I'm (.*)/i),
);

const farewell = first(
    re(/Goodbye/i),
)

const isOOF = () => {
    const hours = new Date().getHours();
    return hours < 9 || hours > 22;
}

const bot = (context: BotContext) => pipe(
    first(
        (t: string) => null,
        matchIf(
            isOOF,
            () => actions.reference.oof()
        ),
        match(
            greeting,
            ({ value }) => actions.reference.greet(value[1])
        ),
        match(
            farewell,
            () => actions.reference.bye()
        ),
        () => actions.reference.default()
    ),
    actions.toAction(context),
)(context.text);

consoleBot(bot);

