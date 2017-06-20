import { Observable } from 'rxjs';
import { konsole } from './Konsole';
import { ITextMatch } from './Text';
import { Match, IRule, rule, Handler, arrayize } from './Rules';

export interface IRegExpMatch {
    groups: RegExpExecArray;
}

export const matchRegExp = (intents: RegExp | RegExp[]) =>
    <M extends Match & ITextMatch = any>(match) => 
        Observable.from(arrayize(intents))
        .do(_ => konsole.log("RegExp.match matching", match))
        .map(regexp => regexp.exec(match.text))
        .do(groups => konsole.log("RegExp.match result", groups))
        .filter(groups => groups && groups[0] === match.text)
        .take(1)
        .do(groups => konsole.log("RegExp.match returning", groups))
        .map(groups => ({
            ... match as any, // remove "as any" when TypeScript fixes this bug,
            groups
        } as M & IRegExpMatch));

// Either call as re(intent, action) or re([intent, intent, ...], action)
export const re = <M extends Match & ITextMatch = any>(intents: RegExp | RegExp[], ruleOrHandler: Handler<M & IRegExpMatch> | IRule<M & IRegExpMatch>) => {
    return rule(matchRegExp(intents), ruleOrHandler) as IRule<M>;
}
