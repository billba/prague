import { CardAction, IChatMessageMatch, Activity } from '../recipes/Chat';
import { ITextMatch } from '../recipes/Text';
import { Observizeable, Rule, Recognizer, Handler, GenericHandler, observize } from '../Rules';
import { Observable } from 'rxjs';

export interface IPromptTextMatch extends ITextMatch {
}

export interface IPromptConfirmMatch {
    confirm: boolean,
}

export interface IPromptChoiceMatch {
    choice: string,
}

interface PromptText<M> {
    type: 'text';
    text: string;
    handler: Handler<M & IPromptTextMatch>;
}

interface PromptConfirm<M> {
    type: 'confirm';
    handler: Handler<M & IPromptConfirmMatch>;
}

interface PromptChoice<M> {
    type: 'choice';
    choices: string[]; // TODO: eventually this will become more complex
    handler: Handler<M & IPromptChoiceMatch>;
}

export interface Prompt<M> {
    rule: Rule<M>,
    creator: (match: M) => Observizeable<any>;
}

interface PromptMap<M extends ITextMatch & IChatMessageMatch> {
    [promptKey: string]: Prompt<M>;
}

export class Prompts<M extends ITextMatch & IChatMessageMatch> {
    private prompts: PromptMap<M> = {};

    constructor(
        private getPromptKey: (match: M) => string,
        private setPromptKey: (match: M, promptKey?: string) => void
    ) {
    }

    add(promptKey: string, prompt: Prompt<M>) {
        if (this.prompts[promptKey]) {
            console.warn(`Prompt key ${promptKey} already exists. Plese use a different key.`);
            return;
        }
        console.log("creating Prompt", promptKey);
        this.prompts[promptKey] = prompt;
    }

    // Prompt Creators
    text(text: string, handler: Handler<M & IPromptTextMatch>) {
        return {
            rule: new Rule<M>(handler),
            creator: (match) =>
                match.reply(text),
        };
    }

    matchChoice(choices: string[]): Recognizer<M, M & IPromptChoiceMatch> {
        return (match) =>
            Observable.of(choices.find(choice => choice.toLowerCase() === match.text.toLowerCase()))
            .filter(choice => !!choice)
            .map(choice => ({
                ... match as any, // remove "as any" when TypeScript fixes this bug
                choice
            }));
    }

    private createChoice(text: string, choices: string[]) {
        return (match: M) => {
            match.reply({
                type: 'message',
                from: { id: 'MyBot' },
                text,
                suggestedActions: { actions: choices.map<CardAction>(choice => ({
                    type: 'postBack',
                    title: choice,
                    value: choice
                })) }
            });
        }
    }

    choice(text: string, choices: string[], handler: Handler<M & IPromptChoiceMatch>): Prompt<M> {
        return {
            rule: new Rule<M>(
                this.matchChoice(choices),
                handler
            ),
            creator: this.createChoice(text, choices)
        };
    }

    matchConfirm(): Recognizer<M & IPromptChoiceMatch, M & IPromptConfirmMatch> {
        return (match) => ({
            ... match as any, // remove "as any" when TypeScript fixes this bug
            confirm: match.choice === 'Yes' 
        });
    }

    confirm(text: string, handler: Handler<M & IPromptConfirmMatch>): Prompt<M> {
        const choices = ['Yes', 'No'];
        return {
            rule: new Rule<M>(
                this.matchChoice(choices),
                this.matchConfirm(),
                handler
            ),
            creator: this.createChoice(text, choices)
        };
    }

    rule(): Rule<M> {
        console.log("creating Prompt.rule");
        return new Rule<M>(
            (match: M) => {
                return Observable.of(this.getPromptKey(match))
                    .do(promptKey => console.log("promptKey", promptKey))
                    .filter(promptKey => promptKey !== undefined)
                    .map(promptKey => this.prompts[promptKey])
                    .filter(ps => ps !== undefined)
                    .flatMap(ps =>
                        ps.rule.recognize(match)
                        .map(match2 => ({
                            ... match2 as any, // remove "as any" when TypeScript fixes this bug    
                            handler: ps.rule.handler
                        }))
                    )
            },
            (match: M & { handler: GenericHandler }) => {
                this.setPromptKey(match, undefined);
                return match.handler(match);
            }
        );
    }

    reply(promptKey: string) {
        return (match: M) => {
            this.setPromptKey(match, promptKey);
            return this.prompts[promptKey].creator(match);
        }
    }
}