import { Observable } from 'rxjs';
import { ITextMatch } from '../recipes/Text';
import { IRule, SimpleRule, Matcher, Handler, arrayize } from '../Rules';

export interface IRegExpMatch {
    groups: RegExpExecArray;
}
export class RegExpHelpers<M extends ITextMatch> {
    constructor() {
    }

    matchRegExp(intents: RegExp | RegExp[]): Matcher<M, M & IRegExpMatch> {
        return (match) => 
            Observable.from(arrayize(intents))
            .do(_ => console.log("RegExp.match matching", match))
            .map(regexp => regexp.exec(match.text))
            .do(groups => console.log("RegExp.match result", groups))
            .filter(groups => groups && groups[0] === match.text)
            .take(1)
            .do(groups => console.log("RegExp.match returning", groups))
            .map(groups => ({
                ... match as any, // remove "as any" when TypeScript fixes this bug,
                groups
            }));
    }

    // Either call as rule(intent, action) or rule([intent, intent, ...], action)
    re(intents: RegExp | RegExp[], handler: Handler<M & IRegExpMatch>): IRule<M> {
        console.log("re.this", this);
        return new SimpleRule(
            this.matchRegExp(intents),
            handler
        );
    }
}
