import { Observable } from 'rxjs';
import { TextSession } from './Intent';
import { UniversalChat, Message, Activity, Address, getAddress, ChatSession } from './Chat';
import { Store, Dispatch, Action } from 'redux';

interface UserInConversation<USERINCONVERSATION> {
    [userId: string]: {
        data: USERINCONVERSATION
    }
}

interface Conversation<USERINCONVERSATION, CONVERSATION> {
    [conversationId: string]: {
        users: UserInConversation<USERINCONVERSATION>;
        data: CONVERSATION;
    }
}

interface User<USER> {
    [userId: string]: {
        data: USER
    }
}

interface Channel<USER, CHANNEL, CONVERSATION, USERINCONVERSATION> {
    [channelId: string]: {
        conversations: Conversation<USERINCONVERSATION, CONVERSATION>;
        users: User<USER>;
        data: CHANNEL;
    }
}

export interface BotState<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION> {
    channels: Channel<USER, CHANNEL, CONVERSATION, USERINCONVERSATION>
    data: BOT;
}

export interface BotData<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION> {
    bot?: BOT
    user?: USER,
    channel?: CHANNEL,
    conversation?: CONVERSATION,
    userInConversation?: USERINCONVERSATION,
    address?: Address,
}

// This selector is a great candidate for memoization via reselect
export const getBotData = <BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>(
    bot: BotState<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>,
    address: Address
): BotData<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION> => {
    const channel = bot.channels && bot.channels[address.channelId];
    const user = channel && channel.users && channel.users[address.userId];
    const conversation = channel && channel.conversations && channel.conversations[address.conversationId];
    const userInConversation = conversation && conversation.users && conversation.users[address.userId];

    return {
        bot: bot.data,
        user: user && user.data,
        channel: channel && channel.data,
        conversation: conversation && conversation.data,
        userInConversation: userInConversation && userInConversation.data,
        address
    };
}

export const updatedBotState = <BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>(
    bot: BotState<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>,
    original: BotData<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>,
    update: BotData<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>
): BotState<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION> => {
    return update.bot || update.user || update.channel || update.conversation || update.userInConversation ? {
        data: update.bot || bot.data,
        channels: update.user || update.channel || update.conversation || update.userInConversation ? {
            ... bot.channels,
            [original.address.channelId]: update.channel || update.conversation || update.userInConversation ? {
                data: update.channel || original.channel,
                conversations: update.conversation || update.userInConversation ? {
                    ... bot.channels[original.address.channelId].conversations,
                    [original.address.conversationId]: {
                        data: update.conversation || original.conversation,
                        users: update.userInConversation ? {
                            ... bot.channels[original.address.channelId].conversations[original.address.conversationId].users,
                            [original.address.userId]: {
                                data: update.userInConversation || original.userInConversation
                            }
                        } : bot.channels[original.address.channelId].conversations[original.address.conversationId].users
                    }
                } : bot.channels[original.address.channelId].conversations,
                users: update.user ? {
                    ... bot.channels[original.address.channelId].users,
                    [original.address.userId]: {
                        data: update.user || original.user
                    }
                } : bot.channels[original.address.channelId].users
            } : bot.channels[original.address.channelId]
        } : bot.channels
    } : bot;
}

export interface ReduxSession<APP, BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION> {
    state: APP;
    data: BotData<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>;
    store: Store<APP>,
}

export class ReduxChatSession<APP, BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION> implements ChatSession, ReduxSession<APP, BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION> {
    text: string;
    address: Address;
    state: APP;
    data: BotData<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>;

    constructor(
        public message: Message,
        public chat: UniversalChat,
        public store: Store<APP>,
        private getBotState: (state: APP) => BotState<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>
    ) {
        this.address = getAddress(message);
        this.state = store.getState();
        this.text = message.text;
        this.data = getBotData(this.getBotState(this.state), this.address)
    }

    send(message: Activity | string) {
        this.chat.reply(this.address, message);
    }
}   

export class ReduxChat<APP, BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION> {
    session$: Observable<ReduxChatSession<APP, BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>>;

    constructor(
        public chat: UniversalChat,
        private store: Store<APP>,
        private getBotState: (state: APP) => BotState<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION>
    ) {
        this.session$ = chat.activity$
            .filter(activity => activity.type === 'message')
            .map((message: Message) => new ReduxChatSession(message, this.chat, this.store, this.getBotState))
    }
}
