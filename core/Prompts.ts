import { konsole } from './Konsole';
import { Router, RouterOrHandler, prependMatcher } from './Router';
import { Observable } from 'rxjs';
import { ITextMatch } from './Text';

export interface IChatPromptChoiceMatch {
    choice: string,
}

export const matchChoice = (choices: string[]) =>
    <M extends ITextMatch>(message: M) => {
        const choice = choices.find(choice => choice.toLowerCase() === message.text.toLowerCase());
        return choice && {
            ... message as any, // remove "as any" when TypeScript fixes this bug
            choice
        } as M & IChatPromptChoiceMatch;
    }

export const promptChoice = <M extends ITextMatch>(choices: string[], routerOrHandler: RouterOrHandler<M & IChatPromptChoiceMatch>) => {
    return prependMatcher<M>(matchChoice(choices), routerOrHandler);
}

export const matchConfirm = () =>
    <M extends ITextMatch>(message: M) => {
        const m = matchChoice(['Yes', 'No'])(message);
        return m.choice === 'Yes' && m;
    }

export const promptConfirm = <M extends ITextMatch>(routerOrHandler: RouterOrHandler<M>) => {
    return prependMatcher<M>(matchConfirm(), routerOrHandler);
}

export interface IChatPromptTimeMatch {
    time: Date,
}

const parseTime = (text: string): Date => {
    const now = new Date();
    let groups = /^(\d{1,2}):(\d{2})(am|pm)$/i.exec(text);
    if (groups) {
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), parseInt(groups[1]) + (groups[3] === 'pm' ? 12 : 0), parseInt(groups[2]));
    }
}

export const matchTime = () => 
    <M extends ITextMatch>(m: M) => {
        const time = parseTime(m.text);
        return time && {
            ... m as any,
            time
        } as M & IChatPromptTimeMatch;
    }
