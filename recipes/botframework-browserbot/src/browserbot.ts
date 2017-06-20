import { IRule, IStateMatch, prependMatcher, callActionIfMatch, konsole } from 'prague';
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
        const rule = prependMatcher<IActivityMatch>(match => ({
            ... match as any,
            data: this.data
        }), chatRule(this.chat, rules));

        this.chat.activity$
        .map(activity => ({ activity } as IActivityMatch))
        .do(match => konsole.log("activity", match.activity))
        .flatMap(
            match => callActionIfMatch(match, rule),
            1
        )
        .subscribe(
            match => konsole.log("handled", match),
            error => konsole.log("error", error),
            () => konsole.log("complete")
        );
    }
}
