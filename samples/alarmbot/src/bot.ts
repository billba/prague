import { UniversalChat, WebChatConnector, IChatMessageMatch } from 'prague-botframework';
import { BrowserBot } from 'prague-botframework-browserbot';

const webChat = new WebChatConnector()
window["browserBot"] = webChat.botConnection;
const browserBot = new BrowserBot(new UniversalChat(webChat.chatConnector), undefined);

// This is our "base message type" which is used often enough that we made it really short

type B = IChatMessageMatch;

// General purpose rule stuff

import { IRouter, first, best, ifMatch, run } from 'prague';

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
    // {
    //     matchLocalToRemote: (match: B) => ({
    //         activity: match.activity,
    //         text: match.text,
    //         message: match.message,
    //         address: match.address,
    //         data: match.data,
    //     }),
    //     matchRemoteToLocal: (match, tasks) => ({
    //         activity: match.activity,
    //         text: match.text,
    //         message: match.message,
    //         address: match.address,
    //         data: match.data,
    //         reply: (message: any) => tasks.push({
    //             method: 'reply',
    //             args: {
    //                 message
    //             }
    //         })
    //     } as any),
    //     executeTask: (match, task) => {
    //         switch (task.method) {
    //             case 'reply':
    //                 match.reply(task.args.message);
    //                 break;
    //             default:
    //                 console.warn(`Remote dialog added task "${task.method}" but no such task exists.`)
    //                 break;
    //         }
    //     },
    // }
);

const rootDialog = dialogs.add(
    'root',
    (dialog) => first(
        m => m.reply("That is alarming.")
    )
)

const appRule: IRouter<B> = dialogs.routeToRoot('root');

browserBot.run({
    message: appRule
});

