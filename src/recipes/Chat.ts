// Generic Chat support

import { Observable } from 'rxjs';
import { Match } from '../Rules';
import { ITextMatch } from './Text';
import { Activity, Typing, EventActivity, Message } from 'botframework-directlinejs';
export { Activity, Typing, EventActivity, Message, CardAction } from 'botframework-directlinejs';

export interface ChatConnector {
    channelId: string;
    postActivity(activity: Activity): Observable<Activity>; // returns the activity sent to chat channel, potentialy augmented with id etc.
    activity$: Observable<Activity>; // activities received from chat channel 
}

interface ChatConnectors {
    [channelId: string]: ChatConnector
}

export interface Address {
    userId?: string,
    conversationId?: string,
    channelId?: string
}

export class UniversalChat implements ChatConnector {
    private chats: ChatConnectors = {};
    public activity$: Observable<Activity>;

    constructor (... chats: ChatConnector[]) {
        chats.forEach(chat => {
            this.chats[chat.channelId] = chat;
        });
        this.activity$ = Observable.merge(... chats.map(chat => chat.activity$));
    }

    channelId = 'chat';

    sendAsync(to: Address, what: Activity | string) {
        let activity: Activity = typeof what === "string"
            ? {
                type: 'message',
                from: { id: 'from' }, // TODO figure this out
                text: what,
                channelId: to.channelId,
                conversation: { id: to.conversationId }
            } : {
                ... what,
                channelId: to.channelId,
                conversation: { id: to.conversationId }
            };
        return this.postActivity(activity);
    }

    send(to: Address, what: Activity | string) {
        this.sendAsync(to, what).subscribe();
    }

    postActivity(activity: Activity) {
        return this.chats[activity.channelId].postActivity(activity);
    }
}

export const getAddress = (activity: Activity): Address => ({
    userId: activity.from.id,
    conversationId: activity.conversation.id,
    channelId: activity.channelId
});

export interface IActivityMatch extends Match {
    activity: Activity;
}

export interface IChatActivityMatch extends IActivityMatch {
    chat: UniversalChat;
    address: Address;
    reply(message: Activity | string);
    replyAsync(message: Activity | string): Observable<Activity>;
}

export interface IChatMessageMatch extends ITextMatch, IChatActivityMatch {
    message: Message;
}

export interface IChatEventMatch extends IChatActivityMatch {
    event: EventActivity;
}

export interface IChatTypingMatch extends IChatActivityMatch {
}

export const reply = <M extends IChatActivityMatch>(message: Activity | string) => (match: M) => match.reply(message);
