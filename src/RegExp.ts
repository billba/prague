import { Observable } from 'rxjs';
import { Handler, Rule, arrayize } from './Intent';

export class RE<S> {
    constructor() {
    }

    // Either call as re(intent, handler) or test([intent, intent, ...], handler)
    rule(
        intents: RegExp | RegExp[],
        handler: Handler<S>
    ): Rule<S> {
        return {
            recognizer: (store, message) => 
                Observable.from(arrayize(intents))
                    .map(regexp => regexp.exec(message.text))
                    .filter(groups => groups && groups[0] === message.text)
                    .take(1)
                    .map(groups => ({ groups }))
                    .do(args => console.log("RegEx result", args)),
            handler,
            name: `REGEXP`
        };
    }
}
