/////////////////////////////// Recipe Glue /////////////////////////////////

import { UniversalChat, WebChatConnector, IChatMessageMatch, IChatActivityMatch, routeChatActivity } from 'prague-botframework';
import { BrowserBot, matchStart } from 'prague-botframework-browserbot';

const webChat = new WebChatConnector()
window["browserBot"] = webChat.botConnection;
const browserBot = new BrowserBot<{}>(new UniversalChat(webChat.chatConnector), {});

// General purpose rule stuff

import { Router, first, best, ifMatch, run, routeMessage, IStateMatch } from 'prague';

// This is our "base message type" which is used often enough that we made it really short

type B = IChatMessageMatch & IStateMatch<any>;

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
    .flatMap(m => routeMessage(activityRouter, m))
    .subscribe(
        message => console.log("handled", message),
        error => console.log("error", error),
        () => console.log("complete")
    );

browserBot.start();

////////////////////////////// Bot Logic //////////////////////////////////

const activityRouter: Router<IChatActivityMatch & IStateMatch<any>> = routeChatActivity({
    event: ifMatch(matchStart(), m => dialogs.setRoot(rootDialog, m as any)),
    message: dialogs.routeToRoot(),
});

import { IDialog } from 'prague';

const rootDialog = dialogs.add('root', {
    constructor: (dialog, m) => m.reply("Type 'start game' to start the game"),
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
        const upperLimit = dialog.args.upperLimit || 50;
        const numGuesses = dialog.args.numGuesses || 10;
        m.reply(`Guess a number between 1 and ${upperLimit}. You have ${numGuesses} guesses.`);
        dialog.state = {
            num: Math.floor(Math.random() * upperLimit),
            guesses: numGuesses
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
