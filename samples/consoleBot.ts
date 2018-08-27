import readline from 'readline';
import { Transform, run } from '../src/prague';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

let exit = false;

export interface BotContext {
    send: (text: string) => void;
    exit: () => void;
    text: string;
}

export const consoleBot = (
    app: Transform<[BotContext], any>
) => {
    rl.question('> ', (text) => {
        run(app)({
            exit: () => { exit = true; },
            send: rl.write,
            text,
        }).subscribe(o => {
            if (exit) {
                rl.close();
            } else {
                consoleBot(app);
            }
        });
    });
}
