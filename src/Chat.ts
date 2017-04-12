// Generic Chat support

import { Observable } from 'rxjs';
import { Activity, Message } from 'botframework-directlinejs';
export { Message, CardAction } from 'botframework-directlinejs';

export interface ChatConnector {
    channelId: string;
    postActivity(activity: Activity): Observable<Activity>; // returns the activity sent to chat channel, potentialy augmented with id etc.
    activity$: Observable<Activity>; // activities received from chat channel 
}

interface Chats {
    [channelId: string]: ChatConnector
}

export class UniversalChat implements ChatConnector {
    private chats: Chats = {};
    public activity$: Observable<Activity>;

    constructor (... chats: ChatConnector[]) {
        chats.forEach(chat => {
            this.chats[chat.channelId] = chat;
        });
        this.activity$ = Observable.merge(... chats.map(chat => chat.activity$));
    }

    channelId = 'chat';
    
    replyAsync(to: Activity, send: Activity | string) {
        let activity: Activity = typeof send === "string"
            ? {
                type: 'message',
                from: { id: 'from' }, // TODO figure this out
                text: send,
                channelId: to.channelId,
                conversation: to.conversation
            } : {
                ... send,
                channelId: to.channelId,
                conversation: to.conversation
            };
        return this.postActivity(activity);
    }

    reply(to: Activity, send: Activity | string) {
        this.replyAsync(to, send).subscribe();
    }

    postActivity(activity: Activity) {
        return this.chats[activity.channelId].postActivity(activity).mapTo(null);
    }
}

export interface Address {
    userId?: string,
    conversationId?: string,
    channelId?: string
}

export const getAddress = (message: Message): Address => ({
    userId: message.from.id,
    conversationId: message.conversation.id,
    channelId: message.channelId
})