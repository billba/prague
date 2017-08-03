import { IStateMatch, konsole, Predicate } from 'prague';
import { UniversalChat, IChatActivityMatch, IChatMessageMatch, IChatEventMatch, IChatTypingMatch, IActivityMatch, matchActivity, matchEvent, Activity } from 'prague-botframework';
import { Subject } from 'rxjs';

export const matchStart = <M extends IChatEventMatch> (): Predicate<M> => 
     (m) => m.event.name === 'start';

export class BrowserBot <BOTDATA extends object> {
    public message$ = new Subject<IStateMatch<BOTDATA> & IChatActivityMatch>();

    constructor(
        private chat: UniversalChat,
        private defaultData: BOTDATA,
    ) {
        chat.activity$
            .do(activity => konsole.log("activity", activity))
            .subscribe(
                activity => {
                    const m = {
                        ... matchActivity(chat)({ activity }),
                        data: defaultData
                    } as IChatActivityMatch & IStateMatch<BOTDATA>;

                    this.message$.next(m);
                    konsole.log("queued message ", m);
                },
                error => konsole.log("error queueing message", error),
                () => konsole.log("complete")
            );
    }

    start() {
        this.message$.next({
            ... matchActivity(this.chat)({
                activity: {
                    type: 'event',
                    name: 'start',
                    value: undefined,
                    from: { id: 'MyBot' },
                    conversation: { id: 'webchat' },
                    channelId: 'webchat',
                } as Activity
            }),
            data: this.defaultData
        } as IStateMatch<BOTDATA> & IChatActivityMatch);
    }
}
