import { konsole } from './Konsole';
import { IRule, Handler, Match, rule } from './Rules';
import { Observable } from 'rxjs';
import { ITextMatch } from './Text';

export interface IChatPromptChoiceMatch {
    choice: string,
}

export const matchChoice = (choices: string[]) =>
    <M extends Match & ITextMatch = any>(match: M) => {
        const choice = choices.find(choice => choice.toLowerCase() === match.text.toLowerCase());
        return choice && {
            ... match as any, // remove "as any" when TypeScript fixes this bug
            choice
        } as M & IChatPromptChoiceMatch
    }

export const promptChoice = <M extends Match & ITextMatch = any>(choices: string[], ruleOrHandler: Handler<M & IChatPromptChoiceMatch> | IRule<M & IChatPromptChoiceMatch>) => {
    return rule(matchChoice(choices), ruleOrHandler) as IRule<M>;
}

export const matchConfirm = () =>
    <M extends Match & ITextMatch = any>(match: M) => {
        const m = matchChoice(['Yes', 'No'])(match);
        return m.choice === 'Yes' && match;
    }

export const promptConfirm = <M extends Match & ITextMatch = any>(ruleOrHandler: Handler<M> | IRule<M>) => {
    return rule(matchConfirm(), ruleOrHandler) as IRule<M>;
}
