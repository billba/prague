import { konsole } from './Konsole';
import { IRule, Matcher, Match } from './Rules';
import { Observable } from 'rxjs';
import { ITextMatch } from './Text';

export interface IChatPromptConfirmMatch {
    confirm: boolean,
}

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

export const matchConfirm = () =>
    <M extends Match & ITextMatch = any>(match: M) => {
        const m = matchChoice(['Yes', 'No'])(match);
        return m && {
            ... match as any, // remove "as any" when TypeScript fixes this bug
            confirm: m.choice === 'Yes' 
        } as M & IChatPromptConfirmMatch;
    }

