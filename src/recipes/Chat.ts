// Generic Chat support

import { Observable } from 'rxjs';
import { IRule, SimpleRule, Observizeable, Match, Matcher, Handler, FirstMatchingRule, combineMatchers } from '../Rules';
import { ITextMatch } from './Text';
import { Prompt, TextPrompts, IChatPromptChoiceMatch, IChatPromptConfirmMatch } from '../rules/Prompt';
import { Activity, Typing, EventActivity, Message, CardAction } from 'botframework-directlinejs';
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
        other?:     IRule<M & IChatActivityMatch>,
    }
) => 
    new FirstMatchingRule<M & IChatActivityMatch>(
        rules.message   && rules.message.prependMatcher(matchMessage),
        rules.event     && rules.event.prependMatcher(matchEvent),
        rules.typing    && rules.typing.prependMatcher(matchTyping),
        rules.other
    )
    .prependMatcher<M & IActivityMatch>(matchActivity(chat));

export class ChatPrompts<M extends IChatMessageMatch> extends TextPrompts<M> {

    // Reply creators

    replyWithChoice(text: string, choices: string[]): Handler<M> {
        return match =>
            match.reply({
                type: 'message',
                from: { id: 'MyBot' },
                text,
                suggestedActions: { actions: choices.map<CardAction>(choice => ({
                    type: 'postBack',
                    title: choice,
                    value: choice
                })) }
            });
    }

    // Prompt creators

    text(text: string, handler: Handler<M>): Prompt<M> {
        return {
            rule: new SimpleRule<M>(match => match, handler),
            replyWithPrompt: match => match.reply(text),
        };
    }

    choice(text: string, choices: string[], handler: Handler<M & IChatPromptChoiceMatch>): Prompt<M> {
        return {
            rule: new SimpleRule<M>(this.matchChoice(choices), handler),
            replyWithPrompt: this.replyWithChoice(text, choices)
        };
    }

    confirm(text: string, handler: Handler<M & IChatPromptConfirmMatch>): Prompt<M> {
        const choices = ['Yes', 'No'];
        return {
            rule: new SimpleRule<M>(
                this.matchChoice(choices),
                this.matchConfirm(),
                handler
            ),
            replyWithPrompt: this.replyWithChoice(text, choices)
        };
    }
}
