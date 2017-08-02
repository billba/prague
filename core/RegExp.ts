import { Observable } from 'rxjs';
import { konsole } from './Konsole';
import { ITextMatch } from './Text';
import { Router, prependMatcher, RouterOrHandler } from './Router';

export interface IRegExpMatch {
    groups: RegExpExecArray;
}

export const matchRE = (... intents: RegExp[]) =>
    <M extends ITextMatch> (message: M) =>
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
        } as M & IRegExpMatch));

// Either call as ifRE(intent, action) or ifRE([intent, intent, ...], action)
export const ifMatchRE = <M extends ITextMatch> (intent: RegExp, routerOrHandler: RouterOrHandler<M & IRegExpMatch>) =>
    prependMatcher<M>(matchRE(intent), routerOrHandler);
