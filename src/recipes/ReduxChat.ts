import { Observable } from 'rxjs';
import { Store } from 'redux';
import { IInputSource } from '../Rules';
import { ITextInput } from './Text';
import { IStateInput } from './State';
import { IReduxInput } from './Redux';
import { UniversalChat, Message, Activity, Address, getAddress, IChatInput } from './Chat';

export interface IReduxChatInput<APP, BOTDATA> extends ITextInput, IReduxInput<APP, BOTDATA>, IChatInput {
}

export class ReduxChat<APP, BOTDATA> implements IInputSource<IReduxChatInput<APP, BOTDATA>> {
    input$: Observable<IReduxChatInput<APP, BOTDATA>>;

    constructor(
        chat: UniversalChat,
        store: Store<APP>,
        getBotData: (state: APP) => BOTDATA
    ) {
        this.input$ = chat.activity$
            .filter(activity => activity.type === 'message')
            .map((message: Message) => {
                const address = getAddress(message);
                const state = store.getState();

                return {
                    // ITextInput
                    text: message.text,

                    // IChatInput
                    message,
                    address,
                    reply: (activity: Activity | string) => chat.send(address, activity),
                    replyAsync: (activity: Activity | string) => chat.sendAsync(address, activity),

                    // IStateInput
                    data: getBotData(state),

                    // IReduxInput
                    store,
                    state,
                    getBotData,
                } as IReduxChatInput<APP, BOTDATA>;
            });
    }
}
