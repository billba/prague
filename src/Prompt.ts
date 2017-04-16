import { CardAction, IChatSession, Activity } from './Chat';
import { ITextSession, Handler, Recognizer, Result, Rule, rule, filter, firstMatch } from './Rules';

type PromptTextArgs = string;

interface PromptText<S> {
    type: 'text';
    text: string;
    handler: (session: S, args: PromptTextArgs) => Result<any>;
}

type PromptConfirmArgs = boolean;

interface PromptConfirm<S> {
    type: 'confirm';
    handler: (session: S, args: PromptConfirmArgs) => Result<any>;
}

type PromptChoiceArgs = string;

interface PromptChoice<S> {
    type: 'choice';
    choices: string[]; // TODO: eventually this will become more complex
    handler: (session: S, args: PromptChoiceArgs) => Result<any>;
}

type PromptTypes<S> = PromptText<S> | PromptChoice<S> | PromptConfirm<S>;

export interface PromptStuff<S> {
    recognizer: Recognizer<S>,
    handler: Handler<S>,
    creator: (session: S) => Result<any>;
}

interface Prompts<S extends ITextSession & IChatSession> {
    [promptKey: string]: PromptStuff<S>;
}

export class Prompt<S extends ITextSession & IChatSession> {
    private prompts: Prompts<S> = {};

    constructor(
        private getPromptKey: (session: S) => string,
        private setPromptKey: (session: S, promptKey?: string) => void
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
    text(promptKey: string, text: string, handler: Handler<S>) {
        this.add(promptKey, {
            recognizer: (session) => session.text,
            handler,
            creator: (session) => {
                this.setPromptKey(session, promptKey);
                session.reply(text);
            }
        });
    }

    choice(promptKey: string, text: string, choices: string[], handler: Handler<S>) {
        this.add(promptKey, {
            recognizer: (session) => choices.find(choice => choice.toLowerCase() === session.text.toLowerCase()),
            handler,
            creator: (session) => {
                this.setPromptKey(session, promptKey);
                session.reply({
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
        });
    }

    confirm(promptKey: string, text: string, handler: Handler<S>) {
        this.add(promptKey, {
            recognizer: (session) => session.text.toLowerCase() === 'yes', // TO DO we can do better than this
            handler, 
            creator: (session) => {
                this.setPromptKey(session, promptKey);
                session.reply({
                    type: 'message',
                    from: { id: 'MyBot' },
                    text,
                    suggestedActions: { actions: ['Yes', 'No'].map<CardAction>(choice => ({
                        type: 'postBack',
                        title: choice,
                        value: choice
                    })) }
                });
            }
        });
    }

    rule(): Rule<S> {
        return filter<S>((session) => this.getPromptKey(session) !== undefined, {
            recognizer: (session) => {
                console.log("prompt looking for", this.getPromptKey(session))
                const rule = this.prompts[this.getPromptKey(session)];
                return rule && rule.recognizer(session);
            },
            handler: (session, args) => {
                const handler = this.prompts[this.getPromptKey(session)].handler;
                this.setPromptKey(session, undefined);
                return handler(session, args);
            },
            name: `PROMPT`
        });
    }

    reply(promptKey: string) {
         return this.prompts[promptKey].creator;
    }
}