import { Observable } from 'rxjs';
import { TextSession, Handler, Rule, arrayize } from './Intent';

export interface REArgs {
    groups: RegExpExecArray;
}

export class RE<S extends TextSession> {
    constructor() {
    }

    // Either call as re(intent, handler) or test([intent, intent, ...], handler)
    rule(
        intents: RegExp | RegExp[],
        handler: Handler<S>
    ): Rule<S> {
        return {
            recognizer: (session) => 
                Observable.from(arrayize(intents))
                    .map(regexp => regexp.exec(session.text))
                    .filter(groups => groups && groups[0] === session.text)
                    .take(1)
                    .map(groups => ({ groups }))
                    .do(args => console.log("RegEx result", args)),
            handler,
            name: `REGEXP`
        };
    }
}
