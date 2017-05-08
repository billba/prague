import { Observable } from 'rxjs';
import { ITextMatch } from '../recipes/Text';
import { IRule, SimpleRule, Matcher, Handler, arrayize, Observizeable } from '../Rules';

export interface IRegExpMatch {
    groups: RegExpExecArray;
}

export class RE<M extends ITextMatch> {
    constructor() {
    }

    match(intents: RegExp | RegExp[]): Matcher<M, M & IRegExpMatch> {
        return (match) => 
            Observable.from(arrayize(intents))
            .do(_ => console.log("RegExp matching", match))
            .map(regexp => regexp.exec(match.text))
            .do(groups => console.log("RegExp result", groups))
            .filter(groups => groups && groups[0] === match.text)
            .take(1)
            .do(groups => console.log("RegExp match!", groups))
            .map(groups => ({
                ... match as any, // remove "as any" when TypeScript fixes this bug,
                groups
            }));
    }

    // Either call as rule(intent, action) or rule([intent, intent, ...], action)
    rule(intents: RegExp | RegExp[], handler: Handler<M & IRegExpMatch>): IRule<M> {
        return new SimpleRule(
            this.match(intents),
            handler
        );
    }
}
