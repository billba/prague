import { UniversalChat, WebChatConnector, IChatMessageMatch, IChatActivityMatch, matchMessage, matchEvent } from 'prague-botframework';
import { BrowserBot, matchStartEvent } from 'prague-botframework-browserbot';

const webChat = new WebChatConnector()
window["browserBot"] = webChat.botConnection;
const browserBot = new BrowserBot(new UniversalChat(webChat.chatConnector), {});

// This is our "base message type" which is used often enough that we made it really short

type B = IChatMessageMatch & IStateMatch<any>;

// General purpose rule stuff

import { IRouter, first, best, ifMatch, run, simpleRouter, matchAll, matchAny, routeMessage, IStateMatch } from 'prague';

// Regular Expressions

import { matchRE, ifMatchRE } from 'prague';

// LUIS

// import { LuisHelpers } from 'prague';

// const { LuisModel } from LuisHelpers(matchChatMessage);

// WARNING: don't check your LUIS id/key in to your repo!

// const luis = new LuisModel('id', 'key');

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

import { throwRoute, catchRoute } from 'prague';

/////////////////////////////////////////////////////////////////////////////////////////////////////

interface AlarmInfo {
    title?: string,
    time?: Date
}

const setAlarm = (alarmState: AlarmInfo) => {

}

const deleteAlarm = (title: string) => {

}

const listAlarms = () => {

}

const getAlarm = (title: string) => {
    
}

const titleDialog = dialogs.add<{}, { title: string } >(
    'getTitle',
    (dialog, m) =>
        m.reply("What shall I call the alarm?"),
    (dialog) => first(
        ifMatch(matchMessage(), m => dialog.end({ title: m.text }))
    )
)

const timeDialog = dialogs.add<{}, { time: string } >(
    'getTime',
    (dialog, m) =>
        m.reply("For when shall I set the alarm?"),
    (dialog) => first(
        ifMatch(matchMessage(), m => dialog.end({ time: m.text }))
    )
)

const setAlarmDialog = dialogs.add<AlarmInfo, AlarmInfo, AlarmInfo>(
    'setAlarm',
    (dialog, m) => {
        dialog.state = dialog.args;
        if (!dialog.state.title || !dialog.state.time)
            m.reply("Okay, let's set a new alarm.");
        return dialog.routeMessage(m);
    },
    (dialog) => first(
        dialog.routeTo(titleDialog, _ => !dialog.state.title, {}, m => {
            dialog.state.title = m.dialogResponse.title;
            return reroute(m);
        }),
        dialog.routeTo(timeDialog, _ => !dialog.state.time, {}, m => {
            dialog.state.time = new Date(m.dialogResponse.time);
            return reroute(m);
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
    (dialog, m) => m.reply("Hi... I'm the alarm bot sample. I can set new alarms, delete existing ones, and list the ones you have."),
    (dialog) => first(
        dialog.routeTo(setAlarmDialog,matchRE(/set (?:an ){0,1}alarm(?: (?:named |called )(.*)){0,1}/), m => ({ title: m.groups[1] } as AlarmInfo)),
        // dialog.routeTo('deleteAlarm', matchRE(/delete alarm/i)),
        // dialog.routeTo('listAlarms', matchRE(/list alarms/i)),
    )
)

const activityRouter: IRouter<IChatActivityMatch & IStateMatch<any>> = first(
    ifMatch(matchStartEvent(), m => dialogs.setRoot(rootDialog, m as any)),
    ifMatch(matchMessage(), dialogs.routeToRoot()),
);

/////////////////////////////////////////////////////////////////////////////////////////////////////

import { Subject, Scheduler } from 'rxjs';

const reroute = (m: B) => {
    browserBot.message$
        .next(m);
    return Promise.resolve();
}

browserBot.message$
    .observeOn(Scheduler.async)
    .flatMap(m => routeMessage(activityRouter, m))
    .subscribe(
        message => console.log("handled", message),
        error => console.log("error", error),
        () => console.log("complete")
    );

browserBot.start();