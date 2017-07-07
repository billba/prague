import { konsole } from './Konsole';
import { IRouter, Handler, Message, router } from './Rules';
import { Observable } from 'rxjs';
import { ITextMatch } from './Text';

export interface IChatPromptChoiceMatch {
    choice: string,
}

export const matchChoice = (choices: string[]) =>
    <M extends Message & ITextMatch = any>(message: M) => {
        const choice = choices.find(choice => choice.toLowerCase() === message.text.toLowerCase());
        return choice && {
            ... message as any, // remove "as any" when TypeScript fixes this bug
            choice
        } as M & IChatPromptChoiceMatch
    }

export const promptChoice = <M extends Message & ITextMatch = any>(choices: string[], ruleOrHandler: Handler<M & IChatPromptChoiceMatch> | IRouter<M & IChatPromptChoiceMatch>) => {
    return router(matchChoice(choices), ruleOrHandler) as IRouter<M>;
}

export const matchConfirm = () =>
    <M extends Message & ITextMatch = any>(message: M) => {
        const m = matchChoice(['Yes', 'No'])(message);
        return m.choice === 'Yes' && message;
    }

export const promptConfirm = <M extends Message & ITextMatch = any>(ruleOrHandler: Handler<M> | IRouter<M>) => {
    return router(matchConfirm(), ruleOrHandler) as IRouter<M>;
}
