/////////////////////////////// Recipe Glue /////////////////////////////////

import { UniversalChat, WebChatConnector, IChatMessageMatch } from 'prague-botframework';
import { BrowserBot } from 'prague-botframework-browserbot';

const webChat = new WebChatConnector()
window["browserBot"] = webChat.botConnection;
const browserBot = new BrowserBot<{}>(new UniversalChat(webChat.chatConnector), undefined);

// General purpose rule stuff

import { Router, first, best, ifMatch, run, routeMessage, IStateMatch } from 'prague';

// This is our "base message type" which is used often enough that we made it really short

type B = IChatMessageMatch & IStateMatch<{}>;

// Regular Expressions

import { matchRE, ifMatchRE } from 'prague';

// LUIS

import { LuisModel } from 'prague';

// WARNING: don't check your LUIS id/key in to your repo!

const luis = new LuisModel('id', 'key');

// Dialogs

import { RootDialogInstance, DialogInstance, Dialogs } from 'prague'

let rootDialogInstance: DialogInstance;

const dialogs = new Dialogs<B>({
        get: (match) => rootDialogInstance,
        set: (match, rdi) => {
            rootDialogInstance = rdi;
        }
    }
);

const reroute = (m: B) => {
    browserBot.message$
        .next(m);
    return Promise.resolve();
}

import { Scheduler } from 'rxjs';

browserBot.message$
    .observeOn(Scheduler.async)
    .flatMap(m => routeMessage(appRouter, m))
    .subscribe(
        message => console.log("handled", message),
        error => console.log("error", error),
        () => console.log("complete")
    );

////////////////////////////// Bot Logic //////////////////////////////////

const appRouter: Router<B> = dialogs.routeToRoot('root');

import { IDialog } from 'prague';

const rootDialog = dialogs.add('root', {
    router: (dialog) => first(
        dialog.routeTo(gameDialog, matchRE(/start game/i)),
        m => m.reply("Type 'start game' to start the game")
    )
} as IDialog<B>);

interface GameState {
    num: number,
    guesses: number
}

interface GameArgs {
    upperLimit?: number;
    numGuesses?: number;
}

const gameDialog = dialogs.add<GameArgs, {}, GameState>('game', {
    constructor: (dialog, m) => {
        m.reply(`Guess a number between 1 and ${dialog.args.upperLimit}. You have ${dialog.args.numGuesses} guesses.`);
        dialog.state = {
            num: Math.floor(Math.random() * (dialog.args.upperLimit || 50)),
            guesses: (dialog.args.numGuesses || 10)
        }
    },
    router: (dialog) => first(
        ifMatchRE(/\d+/, m => {
            const guess = parseInt(m.groups[0]);
            if (guess === dialog.state.num) {
                m.reply("You're right!");
                return dialog.end();
            }

            if (guess < dialog.state.num )
                m.reply("That is too low.");
            else
                m.reply("That is too high.");

            if (--dialog.state.guesses === 0) {
                m.reply("You are out of guesses");
                return dialog.end();
            }
            
            m.reply(`You have ${dialog.state.guesses} left.`);
        }),
        m => m.reply("Please guess a number between 1 and 50.")
    )
});
