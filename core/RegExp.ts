import { Observable } from 'rxjs';
import { konsole } from './Konsole';
import { ITextMatch } from './Text';
import { IRouter, ifMatch, Handler, arrayize } from './Router';

export interface IRegExpMatch {
    groups: RegExpExecArray;
}

export const matchRE = <M extends ITextMatch = any>(... intents: RegExp[]) =>
    (message: M) =>
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
export const ifMatchRE = <M extends ITextMatch = any>(intent: RegExp, ruleOrHandler: Handler<M & IRegExpMatch> | IRouter<M & IRegExpMatch>) =>
    ifMatch(matchRE(intent), ruleOrHandler) as IRouter<M>;
