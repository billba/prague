import readline = require('readline');
import { IRule, ITextMatch, konsole } from 'prague';

export * from 'prague';

export interface INodeConsoleMatch extends ITextMatch {
    reply: (text: string) => void;
}

export const reply = <M extends INodeConsoleMatch>(message: string) => (match: M) => match.reply(message);

export const runNodeConsole = (rule: IRule<INodeConsoleMatch>) => {
    const rl = readline.createInterface({
        input: process.stdin
    });

    rl.on('line', (text: string) =>
        rule.callHandlerIfMatch({
            text,
            reply: console.log
        })
        .subscribe(
            match => konsole.log("handled", match),
            error => konsole.log("error", error),
            () => konsole.log("complete")
        )
    );
}
