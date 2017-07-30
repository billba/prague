// Generic Chat support

import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { IRouter, first, prependMatcher, ITextMatch, konsole, ifMatch, RouterOrHandler } from 'prague';
import { IBotConnection, ConnectionStatus, Activity, Typing, EventActivity, Message, CardAction } from 'botframework-directlinejs';
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

export interface IActivityMatch {
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
    typing: Typing
}

export const reply = <M extends IChatActivityMatch>(toSend: Activity | string) => (message: M) => message.reply(toSend);

export const matchActivity = (chat: UniversalChat) => <M extends IActivityMatch>(message: M) => {
    const address = getAddress(message.activity);

    return {
        ... message as any, // remove "as any" when TypeScript fixes this bug

        // IChatActivityMatch
        address,
        reply: (activity: Activity | string) => chat.send(address, activity),
        replyAsync: (activity: Activity | string) => chat.sendAsync(address, activity),
    } as M & IChatActivityMatch;
}

export const matchMessage = () => <M extends IChatActivityMatch>(message: M) => 
    message.activity.type === 'message' && {
        ... message as any, // remove "as any" when TypeScript fixes this bug

        // IChatMessageMatch
        text: message.activity.text,
        message: message.activity
    } as M & IChatMessageMatch;

export const matchEvent = () => <M extends IChatActivityMatch>(message: M) => 
    message.activity.type === 'event' && {
        ... message as any, // remove "as any" when TypeScript fixes this bug

        // IChatEventMatch
        event: message.activity
    } as M & IChatEventMatch;

export const matchTyping = () => <M extends IChatActivityMatch>(message: M) => 
    message.activity.type === 'typing' && {
        ... message as any, // remove "as any" when TypeScript fixes this bug

        // IChatTypingMatch
        typing: message.activity
    } as M & IChatTypingMatch;

export const chatRouter = <M extends object = any>(
    chat: UniversalChat,
    rules: {
        message?:   IRouter<M & IChatMessageMatch>,
        event?:     IRouter<M & IChatEventMatch>,
        typing?:    IRouter<M & IChatTypingMatch>,
        activity?:  IRouter<M & IChatActivityMatch>,
    }
) =>
    prependMatcher<M & IActivityMatch>(matchActivity(chat), first<M & IChatActivityMatch>(
        rules.message   && prependMatcher(matchMessage(), rules.message),
        rules.event     && prependMatcher(matchEvent(), rules.event),
        rules.typing    && prependMatcher(matchTyping(), rules.typing),
        rules.activity
    ));

export const createChoice = (text: string, choices: string[]): Activity => ({
    type: 'message',
    from: { id: 'MyBot' },
    text,
    suggestedActions: { actions: choices.map<CardAction>(choice => ({
        type: 'postBack',
        title: choice,
        value: choice
    })) }
});

export const createConfirm = (text: string) => {
    const choices = ['Yes', 'No'];
    return createChoice(text, choices);
}


export class WebChatConnector {
    constructor() {
    }

    private activityFromChat$ = new Subject<Activity>();
    private id = 0;
    
    private activityToChat$ = new Subject<Activity>();

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
        konsole.log("posting", activity);
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
