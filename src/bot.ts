import { Observable, BehaviorSubject } from 'rxjs';
import { IBotConnection, Activity, ConnectionStatus } from 'botframework-directlinejs';

class BrowserBot implements IBotConnection {
    constructor() {
    }

    public postActivity(activity: Activity): Observable<string> {
        return Observable.of("success");
    }

    public activity$ = Observable.timer(1000,3000).map(i => ({
        type: 'message',
        id: i.toString(),
        timestamp: (new Date()).toISOString(),
        from: { id: 'browserBot'},
        text: `hello, world #${i}`
    } as Activity));

    public connectionStatus$ = new BehaviorSubject(ConnectionStatus.Online);
    public end() {
    }
}
console.log("setting browserBot");
window["browserBot"] = new BrowserBot();
