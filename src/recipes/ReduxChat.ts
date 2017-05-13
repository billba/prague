import { Observable } from 'rxjs';
import { Store } from 'redux';
import { IRule, Match, Matcher, observize, Helpers } from '../Rules';
import { ITextMatch } from './Text';
import { IStateMatch } from './State';
import { IReduxMatch } from './Redux';
import { UniversalChat, Message, Activity, EventActivity, Typing, Address, getAddress, IChatActivityMatch, IChatMessageMatch, IChatEventMatch, IChatTypingMatch, IActivityMatch, matchActivity, matchMessage, matchEvent, matchTyping } from './Chat';

export interface IReduxActivityMatch<APP, BOTDATA> extends IReduxMatch<APP, BOTDATA>, IChatActivityMatch {
}

export interface IReduxMessageMatch<APP, BOTDATA> extends ITextMatch, IReduxMatch<APP, BOTDATA>, IChatMessageMatch {
}

export interface IReduxEventMatch<APP, BOTDATA> extends IReduxMatch<APP, BOTDATA>, IChatEventMatch {
}

export interface IReduxTypingMatch<APP, BOTDATA> extends IReduxMatch<APP, BOTDATA>, IChatTypingMatch {
}

export class ReduxChat<APP, BOTDATA> {
    constructor(
        private chat: UniversalChat,
        private store: Store<APP>,
        private getBotData: (state: APP) => BOTDATA
    ) {
    }

    matchReduxState<M extends Match>(match: M) {
        const state = this.store.getState();

        return {
            ... match as any, // remove "as any" when TypeScript fixes this bug

            // IReduxMatch
            data: this.getBotData(state),
            store: this.store,
            state,
            getBotData: this.getBotData,
        } as M & IReduxMatch<APP, BOTDATA>;
    }

    run(rules: {
        message?:   IRule<IReduxMessageMatch    <APP, BOTDATA>>,
        event?:     IRule<IReduxEventMatch      <APP, BOTDATA>>,
        typing?:    IRule<IReduxTypingMatch     <APP, BOTDATA>>,
        other?:     IRule<IReduxActivityMatch   <APP, BOTDATA>>
    }) {
        const a = Helpers<IActivityMatch>();
        const r = Helpers<IReduxActivityMatch<APP, BOTDATA>>();

        const rule = a.first(
            a.run(match => console.log("IActivityMatch", match)),
            a.prepend(
                this.matchReduxState,
                matchActivity,
                r.first(
                    r.run(match => console.log("IReduxActivityMatch", match)),
                    r.run(match => console.log("state before", match.state)),
                    rules.message   && r.prepend(matchMessage,    rules.message   ),
                    rules.event     && r.prepend(matchEvent,      rules.event     ),
                    rules.typing    && r.prepend(matchTyping,     rules.typing    ),
                    rules.other
                )
            )
        );

        this.chat.activity$
        .map(activity => ({ activity }))
        .do(match => console.log("activity", match.activity))
        .flatMap(
            match => rule.callHandlerIfMatch(match),
            1
        )
        .subscribe(
            match => console.log("handled", match),
            error => console.log("error", error),
            () => console.log("complete")
        );
    }
}
