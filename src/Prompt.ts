import { CardAction, IChatInput, Activity } from './Chat';
import { ITextInput, Action, Matcher, Observizeable, Rule, filter, firstMatch, observize } from './Rules';
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
    matcher: Matcher<S>,
    action: Action<S>,
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
    text(promptKey: string, text: string, action: (input: S, args: string) => Observizeable<void>) {
        this.add(promptKey, {
            matcher: (input) => ({
                score: 1,
                args: input.text
            }),
            action,
            creator: (input) => {
                this.setPromptKey(input, promptKey);
                input.reply(text);
            }
        });
    }

    choicePrompt(promptKey: string, text: string, choices: string[], action: (input: S, args: string) => Observizeable<void>): PromptStuff<S> {
        return {
            matcher: (input) => {
                const choice = choices.find(choice => choice.toLowerCase() === input.text.toLowerCase());
                return choice && {
                    score: 1,
                    args: choice
                };
            },
            action,
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

    choice(promptKey: string, text: string, choices: string[], action: (input: S, args: string) => Observizeable<void>) {
        this.add(promptKey, this.choicePrompt(promptKey, text, choices, action));
    }

    confirm(promptKey: string, text: string, action: (input: S, args: boolean) => Observizeable<void>) { 
        const choice = this.choicePrompt(promptKey, text, ['Yes', 'No'], null);
        this.add(promptKey, {
            creator: choice.creator,
            action,
            matcher: (input) =>
                observize(choice.matcher(input))
                .filter(args => args !== undefined && args !== null)
                .map(args => ({
                    score: 1,
                    args: args.args === 'Yes',
                }))
        });
    }

    rule(): Rule<S> {
        return (input) => {
            console.log("prompt looking for", this.getPromptKey(input))
            return Observable.of(this.getPromptKey(input))
                .filter(promptKey => promptKey !== undefined)
                .map(promptKey => this.prompts[promptKey])
                .filter(rule => rule !== undefined)
                .flatMap(rule =>
                    observize(rule.matcher(input))
                    .filter(result => result !== undefined && result !== null)
                    .map(result => ({
                        score: 1,
                        action: () => {
                            this.setPromptKey(input, undefined);
                            return rule.action(input, result.args);
                        }
                    }))
                );
        }
    }

    reply(promptKey: string) {
         return this.prompts[promptKey].creator;
    }
}