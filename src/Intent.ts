import { Message } from 'botframework-directlinejs';

export interface IntentAction {
    (groups: RegExpExecArray): void; // return false to continue on to next test
}

export interface IntentPair {
    intent: RegExp,
    action: IntentAction;  
}

// Either call as test(intent, action) or test([intent, intent, ...], action)
export const test = (intents: RegExp | RegExp[], action: IntentAction) =>
    (Array.isArray(intents) ? intents : [intents]).map(intent => ({ intent, action }));

// Either call as testMessage(test) or test([test, test, ...])
export const testMessage = (message: Message, intentPairs: IntentPair[] | IntentPair[][], defaultAction?: () => void) => {
    const match = [].concat(... (Array.isArray(intentPairs[0]) ? intentPairs : [intentPairs])).some(intentPair => {
        const groups = intentPair.intent.exec(message.text)
        if (groups && groups[0] === message.text) {
            intentPair.action(groups);
            return true;
        }
    });
    if (!match && defaultAction)
        defaultAction();
    return match;
}
