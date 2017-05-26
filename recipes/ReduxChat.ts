import { konsole } from './Konsole';
import { Store } from 'redux';
import { IRule } from '../Rules';
import { IReduxMatch, matchReduxState } from './Redux';
import { UniversalChat, IChatActivityMatch, IChatMessageMatch, IChatEventMatch, IChatTypingMatch, IActivityMatch, chatRule } from './Chat';

export class ReduxChat<APP, BOTDATA> {
    constructor(
        private chat: UniversalChat,
        private store: Store<APP>,
        private getBotData: (state: APP) => BOTDATA
    ) {
    }

    run(rules: {
        message?:   IRule<IReduxMatch<APP, BOTDATA> & IChatMessageMatch >,
        event?:     IRule<IReduxMatch<APP, BOTDATA> & IChatEventMatch   >,
        typing?:    IRule<IReduxMatch<APP, BOTDATA> & IChatTypingMatch  >,
        other?:     IRule<IReduxMatch<APP, BOTDATA> & IChatActivityMatch>
    }) {
        const rule = chatRule(this.chat, rules).prependMatcher<IActivityMatch>(matchReduxState(this.store, this.getBotData));

        this.chat.activity$
        .map(activity => ({ activity }))
        .do(match => konsole.log("activity", match.activity))
        .flatMap(
            match => rule.callHandlerIfMatch(match),
            1
        )
        .subscribe(
            match => konsole.log("handled", match),
            error => konsole.log("error", error),
            () => konsole.log("complete")
        );
    }
}
