
/////////////////////////////// Recipe Glue /////////////////////////////////

import { UniversalChat, WebChatConnector, IChatMessageMatch, IChatActivityMatch, routeChatActivity } from 'prague-botframework';
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

// Dialog stuff

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

////////////////////////// Business Logic ////////////////////////////////

interface AlarmInfo {
    title?: string,
    time?: string
}

const alarms: {
    [title: string]: string;
} = {}

const setAlarm = (info: AlarmInfo) => {
    alarms[info.title] = info.time;
}

const deleteAlarm = (title: string): AlarmInfo => {
    const alarm = getAlarm(title);
    delete alarms[title];
    return alarm;
}

const getAlarms = () =>
    Object.entries(alarms).map(([title, time]) => ({ title, time} as AlarmInfo));

const getAlarm = (title: string): AlarmInfo => {
    const time = alarms[title];
    return time && { title, time };
}

////////////////////////////// Bot Logic //////////////////////////////////

const activityRouter: IRouter<IChatActivityMatch & IStateMatch<any>> = routeChatActivity({
    event: ifMatch(m => m.event.name === 'start', m => dialogs.setRoot(rootDialog, m as any)),
    message: dialogs.routeToRoot(),
});

const rootDialog = dialogs.add(
    'root',
    (dialog, m) => m.reply("Hello, I am your alarm bot. I can set new alarms, delete existing ones, and list the ones you have."),
    (dialog) => first(
        dialog.routeTo(setAlarmDialog, matchRE(/set (?:an ){0,1}alarm(?: (?:named |called ){0,1}(.*)){0,1}/i), m => ({ title: m.groups[1] } as AlarmInfo)),
        dialog.routeTo(deleteAlarmDialog, matchRE(/delete (?:the ){0,1}alarm(?: (?:named |called ){0,1}(.*)){0,1}/i), m => ({ title: m.groups[1] } as AlarmInfo)),
        dialog.routeTo(listAlarmsDialog, matchRE(/list (?:the ){0,1}alarms/i)),
        m => m.reply("I don't think I know how to do that.")
    )
)

const setAlarmDialog = dialogs.add<AlarmInfo, AlarmInfo, AlarmInfo>(
    'setAlarm',
    (dialog, m) => {
        dialog.state = dialog.args;
        if (dialog.args.title && getAlarm(dialog.args.title)) {
            m.reply("I'm sorry, that name is taken.");
            dialog.state.title = undefined;
        }
        return dialog.routeMessage(m);
    },
    (dialog) => first(
        dialog.routeTo(titleDialog, _ => !dialog.state.title, { prompt: "What shall I call the alarm?" }, m => {
            if (getAlarm(m.dialogResponse.title))
                m.reply("I'm sorry, that name is taken.")
            else
                dialog.state.title = m.dialogResponse.title;
            return reroute(m);
        }),
        dialog.routeTo(timeDialog, _ => !dialog.state.time, {}, m => {
            dialog.state.time = m.dialogResponse.time;
            return reroute(m);
        }),
        m => {
            setAlarm(dialog.state);
            m.reply(`Okay, I set an alarm called ${dialog.state.title} for ${dialog.state.time.toString()}.`);
            return dialog.end();
        }
    )
);

const titleDialog = dialogs.add<{ prompt: string }, { title: string } >(
    'getTitle',
    (dialog, m) =>
        m.reply(dialog.args.prompt),
    (dialog) => m =>
        dialog.end({ title: m.text })
)

const timeDialog = dialogs.add<{}, { time: string } >(
    'getTime',
    (dialog, m) =>
        m.reply("For when shall I set the alarm?"),
    (dialog) => m =>
        dialog.end({ time: m.text })
)

const deleteAlarmDialog = dialogs.add<AlarmInfo, {}, AlarmInfo>(
    'deleteAlarm',
    (dialog, m) => {
        if (dialog.args.title)
            if (!getAlarm(dialog.args.title))
                m.reply(`I'm sorry, I couldn't find an alarm called ${dialog.args.title}.`);
            else
                dialog.state.title = dialog.args.title;
        return dialog.routeMessage(m);
    },
    (dialog) => first(
        dialog.routeTo(titleDialog, _ => !dialog.state.title, { prompt: "What is the name of the alarm to delete?" }, m => {
            if (!getAlarm(m.dialogResponse.title))
                m.reply(`I'm sorry, I couldn't find an alarm called ${m.dialogResponse.title}.`);
            else    
                dialog.state.title = m.dialogResponse.title;
            return reroute(m);
        }),
        m => {
            const alarm = deleteAlarm(dialog.state.title);
            m.reply(`I have deleted the alarm named ${alarm.title} for ${alarm.time}`);
            return dialog.end();
        },
    )
)

const listAlarmsDialog = dialogs.add(
    'listAlarms',
    (dialog, m) => {
        const alarms = getAlarms();
        console.log("alarms", alarms);
        if (alarms && alarms.length) {
            m.reply("Here are the alarms you have set:");
            alarms.forEach(alarm => m.reply(`${alarm.title} for ${alarm.time}`));
        } else
            m.reply("There are currently no alarms set.");
        return dialog.end();
    },
    undefined
)