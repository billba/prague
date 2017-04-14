import { Observable } from 'rxjs';
import { ITextSession } from './Rules';
import { UniversalChat, Message, Activity, Address, getAddress, IChatSession, IChat } from './Chat';
import { Store } from 'redux';
import { IStateSession } from './State';

export interface ReduxSession<APP, BOTDATA> extends IStateSession<BOTDATA> {
    state: APP;
    store: Store<APP>;
    getBotData: (state: APP) => BOTDATA;
}

export class ReduxChatSession<APP, BOTDATA> implements ITextSession, IChatSession, ReduxSession<APP, BOTDATA> {
    text: string;
    address: Address;
    data: BOTDATA;
    state: APP;

    constructor(
        public message: Message,
        public chat: UniversalChat,
        public store: Store<APP>,
        public getBotData: (state: APP) => BOTDATA
    ) {
        this.address = getAddress(message);
        this.state = store.getState();
        this.text = message.text;
        this.data = getBotData(this.state);
    }

    reply(activity: Activity | string) {
        this.chat.send(this.address, activity);
    }

    replyAsync(activity: Activity | string) {
        return this.chat.sendAsync(this.address, activity);
    }
}   

export class ReduxChat<APP, BOTDATA> implements IChat<ReduxChatSession<APP, BOTDATA>> {
    session$: Observable<ReduxChatSession<APP, BOTDATA>>;

    constructor(
        private chat: UniversalChat,
        private store: Store<APP>,
        private getBotData: (state: APP) => BOTDATA
    ) {
        this.session$ = chat.activity$
            .filter(activity => activity.type === 'message')
            .map((message: Message) => new ReduxChatSession(message, this.chat, this.store, this.getBotData));
    }
}
