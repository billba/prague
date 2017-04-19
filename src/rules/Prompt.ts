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

export interface PromptStuff<S> {
    rule: Rule<S>,
    creator: (input: S) => Observizeable<any>;
}

interface Prompts<S extends ITextInput & IChatInput> {
    [promptKey: string]: PromptStuff<S>;
}

export class Prompt<S extends ITextInput & IChatInput> {
    private prompts: Prompts<S> = {};

    constructor(
        private getPromptKey: (input: S) => string,
        private setPromptKey: (input: S, promptKey?: string) => void
    ) {
    }

    add(promptKey: string, promptStuff: PromptStuff<S>) {
        if (this.prompts[promptKey]) {
            console.warn(`Prompt key ${promptKey} already exists. Plese use a different key.`);
            return;
        }
        this.prompts[promptKey] = promptStuff;
    }

    // Prompt Rule Creators
    text(promptKey: string, text: string, action: (input: S, text: string) => Observizeable<void>) {
        this.add(promptKey, {
            rule: (input) => ({
                action: () => action(input, input.text)
            }),
            creator: (input) => {
                this.setPromptKey(input, promptKey);
                input.reply(text);
            }
        });
    }

    choicePrompt(promptKey: string, text: string, choices: string[], action: (input: S, choice: string) => Observizeable<any>): PromptStuff<S> {
        return {
            rule: (input) =>
                Observable.of(choices.find(choice => choice.toLowerCase() === input.text.toLowerCase()))
                .filter(choice => choice !== undefined && choice != null)
                .map(choice => ({
                    action: () => action(input, choice)
                })),
            creator: (input) => {
                this.setPromptKey(input, promptKey);
                input.reply({
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
        };
    }

    choice(promptKey: string, text: string, choices: string[], action: (input: S, choice: string) => Observizeable<any>) {
        this.add(promptKey, this.choicePrompt(promptKey, text, choices, action));
    }

    confirm(promptKey: string, text: string, action: (input: S, confirm: boolean) => Observizeable<any>) { 
        const choice = this.choicePrompt(promptKey, text, ['Yes', 'No'], (input: S, choice: string) =>
            Observable.of(choice)
            .map(choice => ({
                action: () => action(input, choice === 'Yes')
            })));
        this.add(promptKey, {
            creator: choice.creator,
            rule: composeRule(choice.rule)
        });
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
         return this.prompts[promptKey].creator;
    }
}