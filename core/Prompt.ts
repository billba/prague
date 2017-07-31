import { konsole } from './Konsole';
import { IRouter, Handler, ifMatch } from './Rules';
import { Observable } from 'rxjs';
import { ITextMatch } from './Text';

export interface IChatPromptChoiceMatch {
    choice: string,
}

export const matchChoice = (choices: string[]) =>
    <M extends ITextMatch = any>(message: M) => {
        const choice = choices.find(choice => choice.toLowerCase() === message.text.toLowerCase());
        return choice && {
            ... message as any, // remove "as any" when TypeScript fixes this bug
            choice
        } as M & IChatPromptChoiceMatch;
    }

export const promptChoice = <M extends ITextMatch = any>(choices: string[], ruleOrHandler: Handler<M & IChatPromptChoiceMatch> | IRouter<M & IChatPromptChoiceMatch>) => {
    return ifMatch(matchChoice(choices), ruleOrHandler) as IRouter<M>;
}

export const matchConfirm = () =>
    <M extends ITextMatch = any>(message: M) => {
        const m = matchChoice(['Yes', 'No'])(message);
        return m.choice === 'Yes' && message;
    }

export const promptConfirm = <M extends ITextMatch = any>(ruleOrHandler: Handler<M> | IRouter<M>) => {
    return ifMatch(matchConfirm(), ruleOrHandler) as IRouter<M>;
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
    <M extends ITextMatch = any>(m: M) => {
        const time = parseTime(m.text);
        return time && {
            ... m as any,
            time
        } as M & IChatPromptTimeMatch;
    }
