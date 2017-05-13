import { Store } from 'redux';
import { IRule, Match, Helpers } from '../Rules';
import { IReduxMatch } from './Redux';
import { UniversalChat, IChatActivityMatch, IChatMessageMatch, IChatEventMatch, IChatTypingMatch, IActivityMatch, chatRule } from './Chat';

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
        message?:   IRule<IReduxMatch<APP, BOTDATA> & IChatMessageMatch >,
        event?:     IRule<IReduxMatch<APP, BOTDATA> & IChatEventMatch   >,
        typing?:    IRule<IReduxMatch<APP, BOTDATA> & IChatTypingMatch  >,
        other?:     IRule<IReduxMatch<APP, BOTDATA> & IChatActivityMatch>
    }) {
        const rule = chatRule(rules).prependMatcher<IActivityMatch>(this.matchReduxState);

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
