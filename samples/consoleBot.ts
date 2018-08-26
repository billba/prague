import readline from 'readline';
import { Transform, run } from '../src/prague';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

export interface BotContext {
    send: (text: string) => void;
    text: string;
}
export const consoleBot = (
    app: Transform<[BotContext], any>
) => {
    rl.question('> ', (text) => {
        run(app)({
            send: rl.write,
            text,
        }).subscribe(o => {
            consoleBot(app);
        });
    });
}
