import { CardAction, IChatInput, Activity } from '../recipes/Chat';
import { ITextInput } from '../recipes/Text';
import { Action, composeRule, Observizeable, Rule, filter, firstMatch, observize } from '../Rules';
import { Observable } from 'rxjs';

interface PromptText<S> {
    type: 'text';
    text: string;
    action: (input: S, args: string) => Observizeable<any>;
}

interface PromptConfirm<S> {
    type: 'confirm';
    action: (input: S, args: boolean) => Observizeable<any>;
}

interface PromptChoice<S> {
    type: 'choice';
    choices: string[]; // TODO: eventually this will become more complex
    action: (input: S, args: string) => Observizeable<any>;
}

export interface Prompt<S> {
    rule: Rule<S>,
    creator: (input: S) => Observizeable<any>;
}

interface PromptMap<S extends ITextInput & IChatInput> {
    [promptKey: string]: Prompt<S>;
}

export class Prompts<S extends ITextInput & IChatInput> {
    private prompts: PromptMap<S> = {};

    constructor(
        private getPromptKey: (input: S) => string,
        private setPromptKey: (input: S, promptKey?: string) => void
    ) {
    }

    add(promptKey: string, prompt: Prompt<S>) {
        if (this.prompts[promptKey]) {
            console.warn(`Prompt key ${promptKey} already exists. Plese use a different key.`);
            return;
        }
        this.prompts[promptKey] = prompt;
    }

    // Prompt Creators
    text(text: string, action: (input: S, text: string) => Observizeable<void>) {
        return {
            rule: (input) => ({
                action: () => action(input, input.text)
            }),
            creator: (input) =>
                input.reply(text),
        };
    }

    choice(text: string, choices: string[], action: (input: S, choice: string) => Observizeable<any>): Prompt<S> {
        return {
            rule: (input) =>
                Observable.of(choices.find(choice => choice.toLowerCase() === input.text.toLowerCase()))
                .filter(choice => !!choice !== undefined && choice != null)
                .map(choice => ({
                    action: () => action(input, choice)
                })),
            creator: (input) =>
                input.reply({
                    type: 'message',
                    from: { id: 'MyBot' },
                    text,
                    suggestedActions: { actions: choices.map<CardAction>(choice => ({
                        type: 'postBack',
                        title: choice,
                        value: choice
                    })) }
                }),
        };
    }

    confirm(text: string, action: (input: S, confirm: boolean) => Observizeable<any>) {
        const prompt = this.choice(text, ['Yes', 'No'], (input: S, choice: string) =>
            Observable.of(choice)
            .map(choice => ({
                action: () => action(input, choice === 'Yes')
            })));
        return {
            rule: composeRule(prompt.rule),
            creator: prompt.creator,
        };
    }

    rule(): Rule<S> {
        return (input) => {
            console.log("prompt looking for", this.getPromptKey(input))
            return Observable.of(this.getPromptKey(input))
                .filter(promptKey => promptKey !== undefined)
                .map(promptKey => this.prompts[promptKey])
                .filter(ps => ps !== undefined)
                .flatMap(ps =>
                    observize(ps.rule(input))
                    .map(match => ({
                        action: () => {
                            this.setPromptKey(input, undefined);
                            return match.action();
                        }
                    }))
                );
        }
    }

    reply(promptKey: string) {
        return (input: S) => {
            this.setPromptKey(input, promptKey);
            return this.prompts[promptKey].creator(input);
        }
    }
}