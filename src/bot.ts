import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { IBotConnection, Activity, ConnectionStatus, Message } from 'botframework-directlinejs';

interface ChatConnector {
    postActivity(activity: Activity): Observable<Activity>; // returns the activity sent to chat channel, potentialy augmented with id etc.
    activity$: Observable<Activity>; // activities received from chat channel 
}

class BrowserBot {
    constructor() {
    }

    private activityFromChat$ = new Subject<Activity>();
    private idFromChat = 0;
    
    private activityToChat$ = new Subject<Activity>();
    private idToChat = 0;

    private postActivityFromChat(activity: Activity) {
        const newActivity: Activity = {
            ... activity,
            channelId: "WebChat",
            conversation: { id: "WebChat" },
            timestamp: (new Date()).toISOString(),
            id: (this.idFromChat++).toString()
        }
        this.activityFromChat$.next(newActivity);
        return Observable.of(newActivity.id);
    }

    private postActivityToChat(activity: Activity) {
        const newActivity: Activity = {
            ... activity,
            timestamp: (new Date()).toISOString(),
            id: (this.idToChat++).toString()
        }
        this.activityToChat$.next(newActivity);
        return Observable.of(newActivity);
    }

    public botConnection: IBotConnection = {
        postActivity: (activity: Activity) => this.postActivityFromChat(activity),
        activity$: this.activityToChat$ as Observable<Activity>,
        connectionStatus$: new BehaviorSubject(ConnectionStatus.Online),
        end: () => {}
    }

    public chatConnector: ChatConnector = {
        postActivity: (activity: Activity) => this.postActivityToChat(activity),
        activity$: this.activityFromChat$ as Observable<Activity>,
    }
}

const browserBot = new BrowserBot()

window["browserBot"] = browserBot.botConnection;

browserBot.chatConnector.activity$
.filter(activity => activity.type === 'message')
.flatMap(activity => browserBot.chatConnector.postActivity({
    type: 'message',
    from: { id: 'browserBot'},
    text: `Echo: ${(activity as Message).text}`
})).subscribe();

Observable.timer(1000,5000)
.flatMap(i => browserBot.chatConnector.postActivity({
    type: 'message',
    from: { id: 'browserBot'},
    text: `hello, world #${i}`
})).subscribe();

