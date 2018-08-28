import readline from 'readline';
import { Transform } from '../src/prague';

export interface BotContext {
    send: (text: string) => void;
    exit: () => void;
    text: string;
}

export type Bot = Transform<[BotContext], any>;

export class ConsoleBot {
    private exit = false;

    private rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    constructor(private bot: Bot) {
    }
    
    run() {
        this.rl.question('> ', (text) => {
            this.bot({
                exit: () => { this.exit = true; },
                send: console.log,
                text,
            }).subscribe(o => {
                if (this.exit) {
                    this.rl.close();
                } else {
                    this.run();
                }
            });
        });
    }
}
