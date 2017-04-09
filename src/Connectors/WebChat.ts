import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { IBotConnection, Activity, ConnectionStatus } from 'botframework-directlinejs';
import { ChatConnector } from '../Chat';

export class WebChatConnector {
    constructor() {
    }

    private activityFromChat$ = new Subject<Activity>();
    private id = 0;
    
    private activityToChat$ = new Subject<Activity>();
    private idToChat = 0;

    private postActivityFromChat(activity: Activity) {
        const newActivity: Activity = {
            ... activity,
            channelId: "webchat",
            conversation: { id: "webchat" },
            timestamp: (new Date()).toISOString(),
            id: (this.id++).toString()
        }
        this.activityFromChat$.next(newActivity);
        return Observable.of(newActivity.id);
    }

    private postActivityToChat(activity: Activity) {
        console.log("posting", activity);
        const newActivity: Activity = {
            ... activity,
            timestamp: (new Date()).toISOString(),
            id: (this.id++).toString()
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
        channelId: 'webchat',
        postActivity: (activity: Activity) => this.postActivityToChat(activity),
        activity$: this.activityFromChat$ as Observable<Activity>,
    }
}
