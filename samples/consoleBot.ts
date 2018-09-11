import readline from 'readline';
import { Transform } from '../src/prague';

export interface BotResponse {
    send: (text: string) => void;
    exit: () => void;
}

export interface BotRequest {
    text: string;
}

export type Bot = Transform<[BotRequest, BotResponse], any>;

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
                text,
            }, {
                exit: () => { this.exit = true; },
                send: console.log,
            }).then(o => {
                if (this.exit) {
                    this.rl.close();
                } else {
                    this.run();
                }
            });
        });
    }
}
