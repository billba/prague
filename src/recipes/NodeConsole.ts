import readline = require('readline');
import { IRule } from '../Rules';
import { ITextMatch } from './Text';

export interface INodeConsoleMatch extends ITextMatch {
    reply: (text: string) => void;
}

export const runNodeConsole = (rule: IRule<INodeConsoleMatch>) => {
    const rl = readline.createInterface({
        input: process.stdin
    });

    rl.on('line', (text: string) => rule.callHandlerIfMatch({
        text,
        reply: console.log
    }));
}
