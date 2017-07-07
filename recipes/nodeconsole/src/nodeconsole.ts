import readline = require('readline');
import { IRouter, ITextMatch, konsole, callActionIfMatch } from 'prague';

export * from 'prague';

export interface INodeConsoleMatch extends ITextMatch {
    reply: (text: string) => void;
}

export const reply = <M extends INodeConsoleMatch>(message: string) => (m: M) => m.reply(message);

export const runNodeConsole = (router: IRouter<INodeConsoleMatch>) => {
    const rl = readline.createInterface({
        input: process.stdin
    });

    rl.on('line', (text: string) =>
        callActionIfMatch(router, {
            text,
            reply: console.log
        })
        .subscribe(
            message => konsole.log("handled", message),
            error => konsole.log("error", error),
            () => konsole.log("complete")
        )
    );
}
