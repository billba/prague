import { UniversalChat, WebChatConnector, IChatMessageMatch } from 'prague-botframework';
import { BrowserBot } from 'prague-botframework-browserbot';

const webChat = new WebChatConnector()
window["browserBot"] = webChat.botConnection;
const browserBot = new BrowserBot(new UniversalChat(webChat.chatConnector), {});

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

import { IActivityMatch } from 'prague-botframework';

const routingEvent = <M extends IActivityMatch = any>(m: M) => ({
    type: 'event',
    name: 'routing',
    from: { id: m.activity.from.id },
    conversationId: { id: m.activity.conversation.id },
    channelId: m.activity.channelId
});

const postMessage = <M extends object = any>(m: M) => {
    // post message here
}

const postRoutingEvent = <M extends IActivityMatch = any>(m: M) =>
    postMessage(routingEvent(m));

/////////////////////////////////////////////////////////////////////////////////////////////////////

interface AlarmState {
    title?: string,
    time?: Date
}

const setAlarm = (alarmState: AlarmState) => {
    // set alarm here
}

const titleDialog = dialogs.add<{}, { title: string } >(
    'getTitle',
    (dialog, m) =>
        m.reply("What shall I call the alarm?"),
    (dialog) => first(
        m => dialog.end({ title: m.text })
    )
)

const timeDialog = dialogs.add<{}, { time: string } >(
    'getTime',
    (dialog, m) =>
        m.reply("For when shall I set the alarm?"),
    (dialog) => first(
        m => dialog.end({ time: m.text })
    )
)

const setAlarmDialog = dialogs.add<AlarmState, AlarmState, AlarmState>(
    'setAlarm',
    (dialog, m) => {
        dialog.state = dialog.args;
        m.reply("Let's set an alarm.");
        return dialog.routeMessage(m);
    },
    (dialog) => first(
        dialog.routeTo(titleDialog, _ => !dialog.state.title, {}, m => {
            dialog.state.title = m.dialogResponse.title;
            // return postMessage(m);
        }),
        dialog.routeTo(timeDialog, _ => !dialog.state.time, {}, m => {
            dialog.state.time = new Date(m.dialogResponse.time);
            // return postMessage(m);
        }),
        m => {
            setAlarm(dialog.state);
            m.reply(`Great, I set an alarm called ${dialog.state.title} for ${dialog.state.time.toString()}.`);
            return dialog.end();
        }
    )
);

const rootDialog = dialogs.add(
    'root',
    (dialog) => first(
        dialog.routeTo(setAlarmDialog, matchRE(/set (?:an ){0,1}alarm(?: (?:named |called )(.*)){0,1}/), m => ({ title: m.groups[1] } as AlarmState)),
        // dialog.routeTo('deleteAlarm', matchRE(/delete alarm/i)),
        // dialog.routeTo('listAlarms', matchRE(/list alarms/i)),
        ifMatchRE(/help/, m => m.reply("global help")),
        m => m.reply("Hi... I'm the alarm bot sample. I can set new alarms, delete existing ones, and list the ones you have.")
    )
)

const appRouter: IRouter<B> = dialogs.routeToRoot('root');

/////////////////////////////////////////////////////////////////////////////////////////////////////

import { Subject } from 'rxjs';

browserBot.run({
    message: appRouter,
});


