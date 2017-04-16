import { Observable } from 'rxjs';
import { ITextInput } from './Rules';
import { UniversalChat, Message, Activity, Address, getAddress, IChatInput, IChat } from './Chat';
import { Store } from 'redux';
import { IStateInput } from './State';

export interface ReduxInput<APP, BOTDATA> extends IStateInput<BOTDATA> {
    state: APP;
    store: Store<APP>;
    getBotData: (state: APP) => BOTDATA;
}

export class ReduxChatInput<APP, BOTDATA> implements ITextInput, IChatInput, ReduxInput<APP, BOTDATA> {
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

export class ReduxChat<APP, BOTDATA> implements IChat<ReduxChatInput<APP, BOTDATA>> {
    input$: Observable<ReduxChatInput<APP, BOTDATA>>;

    constructor(
        private chat: UniversalChat,
        private store: Store<APP>,
        private getBotData: (state: APP) => BOTDATA
    ) {
        this.input$ = chat.activity$
            .filter(activity => activity.type === 'message')
            .map((message: Message) => new ReduxChatInput(message, this.chat, this.store, this.getBotData));
    }
}
