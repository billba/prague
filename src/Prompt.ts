import { CardAction, IChatSession } from './Chat';
import { ITextSession, Handler, Recognizer, Rule, Context } from './Intent';
import { Observable } from 'rxjs';

export interface PromptRules<S extends ITextSession & IChatSession> {
    [promptKey: string]: Rule<S>;
}

export interface PromptRulesMaker<S extends ITextSession & IChatSession> {
    (prompt: Prompt<S>): PromptRules<S>;
}

export type Choice = string; // TODO: eventually this will be something more complex

export type ChoiceList = Choice[];

export interface ChoiceLists {
    [choiceKey: string]: ChoiceList;
}

export class Prompt<S extends ITextSession & IChatSession> {
    private promptRules: PromptRules<S>;

    constructor(
        private choiceLists: ChoiceLists,
        private promptRulesMaker: PromptRulesMaker<S>,
        private getPromptKey: (session: S) => string,
        private setPromptKey: (session: S, promptKey?: string) => void
    ) {
        this.promptRules = promptRulesMaker(this);
    }

    // Prompt Rule Creators
    text(handler: Handler<S>): Rule<S> {
        return {
            recognizer: (session) => ({ text: session.text }),
            handler
        }
    }

    choice(choiceName: string, handler: Handler<S>) {
        return {
            recognizer: (session) => {
                const choice = this.choiceLists[choiceName].find(choice => choice.toLowerCase() === session.text.toLowerCase());
                return choice && { choice };
            },
            handler
        }
    }

    confirm(handler: Handler<S>) {
        return {
            recognizer: (session) => {
                const confirm = session.text.toLowerCase() === 'yes'; // TO DO we can do better than this
                return confirm && { confirm };
            },
            handler
        }
    }

    context(): Context<S> {
        return ({
            query: (session) => this.getPromptKey(session) !== undefined,
            rules: [{
                recognizer: (session) => {
                    const rule = this.promptRules[this.getPromptKey(session)];
                    return rule && rule.recognizer(session);
                },
                handler: (session, args) => {
                    const rule = this.promptRules[this.getPromptKey(session)];
                    this.setPromptKey(session);
                    return rule.handler(session, args);
                },
                name: `PROMPT`
            }]
        });
    }

    // Prompt Message Creatgors -- feels like these maybe belong in the connectors?

    textCreate(session: S, promptKey: string, text: string) {
        this.setPromptKey(session, promptKey);
        session.reply(text);
    }

    choiceCreate(session: S, promptKey: string, choiceName: string, text: string) {
        const choiceList = this.choiceLists[choiceName];
        if (!choiceList)
            return;
        this.setPromptKey(session, promptKey);
        session.reply({
            type: 'message',
            from: { id: 'RecipeBot' },
            text,
            suggestedActions: { actions: choiceList.map<CardAction>(choice => ({
                type: 'postBack',
                title: choice,
                value: choice
            })) }
        });
    }

    private yorn: ChoiceList = ['Yes', 'No'];

    confirmCreate(session: S, promptKey: string, text: string) {
        this.setPromptKey(session, promptKey);
        session.reply({
            type: 'message',
            from: { id: 'RecipeBot' },
            text,
            suggestedActions: { actions: this.yorn.map<CardAction>(choice => ({
                type: 'postBack',
                title: choice,
                value: choice
            })) }
        });
    }
}