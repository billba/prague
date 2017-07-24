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

interface AlarmState {
    title: string,
    time: Date
}

const setAlarm = (alarmState: AlarmState) => {

}

const setAlarmDialog = dialogs.add<AlarmState, AlarmState, AlarmState>(
    'setAlarm',
    (dialog, m) => m.reply("Let's set an alarm. What do you want to call it?"),
    (dialog) => first(
        ifMatchRE(/help/, m => {}),
        ifMatch(_ => !dialog.state.title, m => {
            dialog.state.title = m.text;
            m.reply("For when shall I set the alarm?");
        }),
        ifMatch(_ => !dialog.state.time, m => {
            dialog.state.time = new Date(m.text);
            m.reply(`Great, I set an alarm called ${dialog.state.title} for ${dialog.state.time.toString()}.`);
            return dialog.end({ title: dialog.state.title, time: dialog.state.time });
        })
    )
)

const rootDialog = dialogs.add(
    'root',
    (dialog) => first(
        ifMatchRE(/set alarm/i, m => dialog.activate(setAlarmDialog, m => {})),
        dialog.routeTo('setAlarm', m => setAlarm(m.dialogResponse)),
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

