import readline = require('readline');
import { ITextMatch, konsole, IStateMatch } from 'prague';
import { Subject } from 'rxjs';

export interface INodeConsoleMatch extends ITextMatch {
    reply: (text: string) => void;
}

export class NodeConsole <BOTDATA extends object> {
    public message$ = new Subject<IStateMatch<BOTDATA> & INodeConsoleMatch>();
    constructor(
        private defaultData: BOTDATA
    ) {
        const rl = readline.createInterface({
            input: process.stdin
        });

        rl.on('line', (text: string) =>
            this.message$.next({
                text,
                reply: console.log,
                data: defaultData
            })
        );
    }

    start() {
        this.message$.next({
            text: 'START',
            reply: console.log,
            data: this.defaultData
        });
    }
}
