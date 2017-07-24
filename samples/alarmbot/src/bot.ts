import { UniversalChat, WebChatConnector, IChatMessageMatch } from 'prague-botframework';
import { BrowserBot } from 'prague-botframework-browserbot';

const webChat = new WebChatConnector()
window["browserBot"] = webChat.botConnection;
const browserBot = new BrowserBot(new UniversalChat(webChat.chatConnector), undefined);

// This is our "base message type" which is used often enough that we made it really short

type B = IChatMessageMatch;

// General purpose rule stuff

import { IRouter, first, best, ifMatch, run, simpleRouter } from 'prague';

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

/////////////////////////////////////////////////////////////////////////////////////////////////////

const setAlarm = dialogs.add(
    'setAlarm',
    (dialog, m) => m.reply("let's set an alarm"),
    (dialog) => first(
        ifMatchRE(/alarm/, m => m.reply("alarm stuff"))
    )
)

const rootDialog = dialogs.add(
    'root',
    (dialog) => first(
        ifMatchRE(/set alarm/i, m => dialog.activate('setAlarm')),
        dialog.routeTo('setAlarm'),
        ifMatchRE(/delete alarm/i, m => m.reply("let's delete an alarm")),
        ifMatchRE(/list alarms/i, m => m.reply("let's list the alarms")),
        m => m.reply("Hi... I'm the alarm bot sample. I can set new alarms or delete existing ones.")
    )
)

/////////////////////////////////////////////////////////////////////////////////////////////////////

const appRouter: IRouter<B> = dialogs.routeToRoot('root');

browserBot.run({
    message: appRouter,
});

