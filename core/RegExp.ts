import { Observable } from 'rxjs';
import { konsole } from './Konsole';
import { ITextMatch } from './Text';
import { IRouter, router, Handler, arrayize } from './Rules';

export interface IRegExpMatch {
    groups: RegExpExecArray;
}

export const matchRegExp = (intents: RegExp | RegExp[]) =>
    <M extends ITextMatch = any>(message: M) =>
        Observable.from(arrayize(intents))
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

// Either call as re(intent, action) or re([intent, intent, ...], action)
export const re = <M extends ITextMatch = any>(intents: RegExp | RegExp[], ruleOrHandler: Handler<M & IRegExpMatch> | IRouter<M & IRegExpMatch>) =>
    router(matchRegExp(intents), ruleOrHandler) as IRouter<M>;
