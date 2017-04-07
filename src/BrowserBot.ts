import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { IBotConnection, Activity, ConnectionStatus } from 'botframework-directlinejs';
import { ChatConnector } from './Chat';

export class BrowserBot {
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
        console.log("posting", activity);
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
        send: (text: string) => this.postActivityToChat({
            type: 'message',
            from: { id: 'BrowserBot' },
            text
        }).subscribe(),
        activity$: this.activityFromChat$ as Observable<Activity>,
    }
}
