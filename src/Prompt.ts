import { UniversalChat, Message, CardAction, Address, getAddress } from './Chat';
import { Store } from 'redux';
import { Handler, Recognizer, Rule, Context } from './Intent';
import { Observable } from 'rxjs';

export interface PromptRules<S> {
    [promptKey: string]: Rule<S>;
}

export interface PromptRulesMaker<S> {
    (prompt: Prompt<S>): PromptRules<S>;
}

export type Choice = string; // TODO: eventually this will be something more complex

export type ChoiceList = Choice[];

export interface ChoiceLists {
    [choiceKey: string]: ChoiceList;
}

export class Prompt<S> {
    private promptRules: PromptRules<S>;

    constructor(
        private chat: UniversalChat,
        private store: Store<S>,
        private choiceLists: ChoiceLists,
        private promptRulesMaker: PromptRulesMaker<S>,
        private getPromptKey: (address: Address) => string,
        private setPromptKey: (promptKey: string, address: Address) => void

    ) {
        this.promptRules = promptRulesMaker(this);
    }

    // Prompt Rule Creators
    text(handler: Handler<S>): Rule<S> {
        return {
            recognizer: (message) => ({ text: message.text }),
            handler
        }
    }

    choice(choiceName: string, handler: Handler<S>) {
        return {
            recognizer: (message) => {
                const choice = this.choiceLists[choiceName].find(choice => choice.toLowerCase() === message.text.toLowerCase());
                return choice && { choice };
            },
            handler
        }
    }

    confirm(handler: Handler<S>) {
        return {
            recognizer: (message) => {
                const confirm = message.text.toLowerCase() === 'yes'; // TO DO we can do better than this
                return confirm && { confirm };
            },
            handler
        }
    }

    context(): Context<S> {
        return ({
            query: (state, address) => {
                console.log("address", address);
                console.log("promptKey", this.getPromptKey(address));
                return this.getPromptKey(address) !== undefined},
            rules: [{
                recognizer: (message, state) => {
                    const rule = this.promptRules[this.getPromptKey(getAddress(message))];
                    return rule && rule.recognizer(message);
                },
                handler: (message, args, store) => {
                    const address = getAddress(message);
                    const rule = this.promptRules[this.getPromptKey(address)];
                    this.setPromptKey(undefined, address);
                    return rule.handler(message, args, store);
                },
                name: `PROMPT`
            }]
        });
    }

    // Prompt Creators - eventually the Connectors will have to do some translation of these, somehow

    textCreate(message: Message, promptKey: string, text: string) {
        this.setPromptKey(promptKey, getAddress(message));
        this.chat.reply(message, text);        
    }

    choiceCreate(message: Message, promptKey: string, choiceName: string, text: string) {
        const choiceList = this.choiceLists[choiceName];
        if (!choiceList)
            return;
        this.setPromptKey(promptKey, getAddress(message));
        this.chat.reply(message, {
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

    confirmCreate(message: Message, promptKey: string, text: string) {
        this.setPromptKey(promptKey, getAddress(message));
        this.chat.reply(message, {
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