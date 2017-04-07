import { Recognizer, Handler, Rule } from './Intent';
import { Message } from 'botframework-directlinejs';

// Either call as re(intent, handler) or test([intent, intent, ...], handler)
export const re = <S>(
    intents: RegExp | RegExp[],
    handler: Handler<S>
): Rule<S> => ({
    recognizers: (Array.isArray(intents) ? intents : [intents]).map<Recognizer<S>>(intent => 
        (state, message) => {
            const groups = intent.exec(message.text);
            if (groups && groups[0] === message.text)
                return { groups };
            return null;
        }),
    handler
});
