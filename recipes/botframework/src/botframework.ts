// Generic Chat support

import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { IRule, Match, FirstMatchingRule, ITextMatch } from 'prague';
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
    typing: Typing
}

export const reply = <M extends IChatActivityMatch>(message: Activity | string) => (match: M) => match.reply(message);

export const matchActivity = (chat: UniversalChat) => <M extends IActivityMatch>(match: M) => {
    const address = getAddress(match.activity);

    return {
        ... match as any, // remove "as any" when TypeScript fixes this bug

        // IChatActivityMatch
        address,
        reply: (activity: Activity | string) => chat.send(address, activity),
        replyAsync: (activity: Activity | string) => chat.sendAsync(address, activity),
    } as M & IChatActivityMatch;
}

export const matchMessage = <M extends IChatActivityMatch>(match: M) => 
    match.activity.type === 'message' && {
        ... match as any, // remove "as any" when TypeScript fixes this bug

        // IChatMessageMatch
        text: match.activity.text,
        message: match.activity
    } as M & ITextMatch & IChatMessageMatch;

export const matchEvent = <M extends IChatActivityMatch>(match: M) => 
    match.activity.type === 'event' && {
        ... match as any, // remove "as any" when TypeScript fixes this bug

        // IChatEventMatch
        event: match.activity
    } as M & ITextMatch & IChatEventMatch;

export const matchTyping = <M extends IChatActivityMatch>(match: M) => 
    match.activity.type === 'typing' && {
        ... match as any, // remove "as any" when TypeScript fixes this bug

        // IChatTypingMatch
        typing: match.activity
    } as M & ITextMatch & IChatEventMatch;

export const chatRule = <M extends Match>(
    chat: UniversalChat,
    rules: {
        message?:   IRule<M & IChatMessageMatch>,
        event?:     IRule<M & IChatEventMatch>,
        typing?:    IRule<M & IChatTypingMatch>,
        activity?:  IRule<M & IChatActivityMatch>,
    }
) => 
    new FirstMatchingRule<M & IChatActivityMatch>(
        rules.message   && rules.message.prependMatcher(matchMessage),
        rules.event     && rules.event.prependMatcher(matchEvent),
        rules.typing    && rules.typing.prependMatcher(matchTyping),
        rules.activity
    )
    .prependMatcher<M & IActivityMatch>(matchActivity(chat));

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
