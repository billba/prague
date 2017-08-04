/////////////////////////////// Recipe Glue /////////////////////////////////

import { UniversalChat, WebChatConnector, IChatMessageMatch, routeChatActivity } from 'prague-botframework';
import { BrowserBot } from 'prague-botframework-browserbot';

const webChat = new WebChatConnector()
window["browserBot"] = webChat.botConnection;
const browserBot = new BrowserBot<{}>(new UniversalChat(webChat.chatConnector), {});

// General purpose rule stuff

import { Router, first, best, ifMatch, run, simpleRouter, routeMessage, IStateMatch } from 'prague';

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
    .flatMap(m => routeMessage(routeChatActivity({
        message: appRouter }), m as any))
    .subscribe(
        message => console.log("handled", message),
        error => console.log("error", error),
        () => console.log("complete")
    );

////////////////////////////// Bot Logic //////////////////////////////////

const appRouter: Router<B> = simpleRouter(
    m => m.reply("Vítejte v Praze (Welcome to Prague)")
)
