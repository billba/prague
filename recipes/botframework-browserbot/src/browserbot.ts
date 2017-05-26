import { IRule, IStateMatch, konsole } from 'prague';
import { UniversalChat, IChatActivityMatch, IChatMessageMatch, IChatEventMatch, IChatTypingMatch, IActivityMatch, chatRule } from 'prague-botframework';

export * from 'prague';
export * from 'prague-botframework';

export class BrowserBot<BOTDATA> {
    constructor(
        private chat: UniversalChat,
        private data: BOTDATA
    ) {
    }

    run(rules: {
        message?:   IRule<IStateMatch<BOTDATA> & IChatMessageMatch >,
        event?:     IRule<IStateMatch<BOTDATA> & IChatEventMatch   >,
        typing?:    IRule<IStateMatch<BOTDATA> & IChatTypingMatch  >,
        activity?:  IRule<IStateMatch<BOTDATA> & IChatActivityMatch>
    }) {
        const rule = chatRule(this.chat, rules).prependMatcher<IActivityMatch>(match => ({
            ... match as any,
            data: this.data
        }));

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
