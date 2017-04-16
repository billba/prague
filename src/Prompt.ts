import { CardAction, IChatInput, Activity } from './Chat';
import { ITextInput, Action, Matcher, Result, Rule, rule, filter, firstMatch } from './Rules';

type PromptTextArgs = string;

interface PromptText<S> {
    type: 'text';
    text: string;
    action: (input: S, args: PromptTextArgs) => Result<any>;
}

type PromptConfirmArgs = boolean;

interface PromptConfirm<S> {
    type: 'confirm';
    action: (input: S, args: PromptConfirmArgs) => Result<any>;
}

type PromptChoiceArgs = string;

interface PromptChoice<S> {
    type: 'choice';
    choices: string[]; // TODO: eventually this will become more complex
    action: (input: S, args: PromptChoiceArgs) => Result<any>;
}

type PromptTypes<S> = PromptText<S> | PromptChoice<S> | PromptConfirm<S>;

export interface PromptStuff<S> {
    matcher: Matcher<S>,
    action: Action<S>,
    creator: (input: S) => Result<any>;
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
    text(promptKey: string, text: string, action: Action<S>) {
        this.add(promptKey, {
            matcher: (input) => input.text,
            action,
            creator: (input) => {
                this.setPromptKey(input, promptKey);
                input.reply(text);
            }
        });
    }

    choicePrompt(promptKey: string, text: string, choices: string[], action: Action<S>): PromptStuff<S> {
        return {
            matcher: (input) => choices.find(choice => choice.toLowerCase() === input.text.toLowerCase()),
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

    choice(promptKey: string, text: string, choices: string[], action: Action<S>) {
        this.add(promptKey, this.choicePrompt(promptKey, text, choices, action));
    }

    confirm(promptKey: string, text: string, action: Action<S>) { 
        const choice = this.choicePrompt(promptKey, text, ['Yes', 'No'], action);
        this.add(promptKey, {
            ... choice,
            matcher: (input) => {
                const args: string = choice.matcher(input);
                return args !== undefined && args === 'Yes';
            }
        });
    }

    rule(): Rule<S> {
        return filter<S>((input) => this.getPromptKey(input) !== undefined, {
            matcher: (input) => {
                console.log("prompt looking for", this.getPromptKey(input))
                const rule = this.prompts[this.getPromptKey(input)];
                return rule && rule.matcher(input);
            },
            action: (input, args) => {
                const action = this.prompts[this.getPromptKey(input)].action;
                this.setPromptKey(input, undefined);
                return action(input, args);
            },
            name: `PROMPT`
        });
    }

    reply(promptKey: string) {
         return this.prompts[promptKey].creator;
    }
}