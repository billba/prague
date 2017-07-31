
/////////////////////////////// Recipe Glue /////////////////////////////////

import { UniversalChat, WebChatConnector, IChatMessageMatch, IChatActivityMatch, routeChatActivity } from 'prague-botframework';
import { BrowserBot, matchStart } from 'prague-botframework-browserbot';

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

import { chatPrompts } from 'prague-botframework';

const { textPrompt, timePrompt } = chatPrompts(dialogs);

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
        error => console.warn("error", error),
        () => console.log("complete")
    );

browserBot.start();

////////////////////////// Business Logic ////////////////////////////////

interface AlarmInfo {
    title?: string,
    time?: Date
}

class Alarms {
    private alarms: {
        [title: string]: Date;
    } = {}

    setAlarm(info: AlarmInfo) {
        this.alarms[info.title] = info.time;
    }

    deleteAlarm(title: string): AlarmInfo {
        const alarm = this.getAlarm(title);
        delete this.alarms[title];
        return alarm;
    }

    getAlarms() {
        return Object.entries(this.alarms).map(([title, time]) => ({ title, time} as AlarmInfo));
    }

    getAlarm(title: string): AlarmInfo {
        const time = this.alarms[title];
        return time && { title, time };
    }
}

const alarms = new Alarms();

////////////////////////////// Bot Logic //////////////////////////////////

const activityRouter: IRouter<IChatActivityMatch & IStateMatch<any>> = routeChatActivity({
    event: ifMatch(matchStart(), m => dialogs.setRoot(rootDialog, m as any)),
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
        if (dialog.args.title && alarms.getAlarm(dialog.args.title)) {
            m.reply("I'm sorry, that name is taken.");
            dialog.state.title = undefined;
        }
        return dialog.routeMessage(m);
    },
    (dialog) => first(
        dialog.routeTo(textPrompt, _ => !dialog.state.title, { prompt: "What shall I call the alarm?" }, m => {
            if (alarms.getAlarm(m.dialogResponse.text))
                m.reply("I'm sorry, that name is taken.")
            else
                dialog.state.title = m.dialogResponse.text;
            return reroute(m);
        }),
        dialog.routeTo(timePrompt, _ => !dialog.state.time, { prompt: "For when shall I set the alarm?" }, m => {
            dialog.state.time = m.dialogResponse.time;
            return reroute(m);
        }),
        m => {
            alarms.setAlarm(dialog.state);
            m.reply(`Okay, I set an alarm called ${dialog.state.title} for ${dialog.state.time.toLocaleTimeString("en-us")}.`);
            return dialog.end();
        }
    )
);

const deleteAlarmDialog = dialogs.add<AlarmInfo, {}, AlarmInfo>(
    'deleteAlarm',
    (dialog, m) => {
        if (dialog.args.title)
            if (!alarms.getAlarm(dialog.args.title))
                m.reply(`I'm sorry, I couldn't find an alarm called ${dialog.args.title}.`);
            else
                dialog.state.title = dialog.args.title;
        return dialog.routeMessage(m);
    },
    (dialog) => first(
        dialog.routeTo(textPrompt, _ => !dialog.state.title, { prompt: "What is the name of the alarm to delete?" }, m => {
            if (!alarms.getAlarm(m.dialogResponse.text))
                m.reply(`I'm sorry, I couldn't find an alarm called ${m.dialogResponse.text}.`);
            else    
                dialog.state.title = m.dialogResponse.text;
            return reroute(m);
        }),
        m => {
            const alarm = alarms.deleteAlarm(dialog.state.title);
            m.reply(`I have deleted the alarm named ${alarm.title} for ${alarm.time.toLocaleTimeString("en-us")}`);
            return dialog.end();
        },
    )
)

const listAlarmsDialog = dialogs.add(
    'listAlarms',
    (dialog, m) => {
        const _alarms = alarms.getAlarms();
        if (_alarms && _alarms.length) {
            m.reply("Here are the alarms you have set:");
            _alarms.forEach(alarm => m.reply(`${alarm.title} for ${alarm.time}`));
        } else
            m.reply("There are currently no alarms set.");
        return dialog.end();
    },
    undefined
)