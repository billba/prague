import { Observable } from 'rxjs';
import { konsole } from './Konsole';
import { ITextMatch } from './Text';
import { Router, prependMatcher, RouterOrHandler, Matcher } from './Router';

export interface IRegExpMatch {
    groups: RegExpExecArray;
}

export const matchRE = <M extends ITextMatch>(
    ... intents: RegExp[]
): Matcher<M, M & IRegExpMatch> =>
     (message) =>
        Observable.from(intents)
        .do(_ => konsole.log("matchRegExp matching", message))
        .map(regexp => regexp.exec(message.text))
        .do(groups => konsole.log("matchRegExp result", groups))
        .filter(groups => groups && groups[0] === message.text)
        .take(1)
        .do(groups => konsole.log("matchRegExp returning", groups))
        .map(groups => ({
            ... message as any, // remove "as any" when TypeScript fixes this bug,
            groups
        }));

// Either call as ifRE(intent, action) or ifRE([intent, intent, ...], action)
export const ifMatchRE = <M extends ITextMatch> (
    intent: RegExp, routerOrHandler: RouterOrHandler<M & IRegExpMatch>
): Router<M> =>
    prependMatcher(matchRE(intent), routerOrHandler);
