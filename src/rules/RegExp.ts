import { Observable } from 'rxjs';
import { ITextInput } from '../recipes/Text';
import { Action, Rule, Match, arrayize, Observizeable } from '../Rules';

export interface REArgs {
    groups: RegExpExecArray;
}

export class RE<S extends ITextInput> {
    constructor() {
    }

    // Either call as re(intent, action) or test([intent, intent, ...], action)
    rule(
        intents: RegExp | RegExp[],
        action: (input: S, args: { groups: RegExpExecArray }) => Observizeable<any>
    ): Rule<S> {
        return (input) => 
            Observable.from(arrayize(intents))
            .map(regexp => regexp.exec(input.text))
            .filter(groups => groups && groups[0] === input.text)
            .take(1)
            .map(groups => ({
                action: () => action(input, { groups })
            } as Match));
    }
}
