import { ChatConnector } from './Chat';
import { Store } from 'redux';
import { Message, CardAction } from 'botframework-directlinejs';
import { Entities, Recognizer, Handler, Rule, Context } from './Intent';

// Eventually we'll probably want to turn this into a selector function instead of a hardwired interface definition
export interface Promptable {
    bot: {
        promptKey: string;
    }
}

export interface PromptRules<S> {
    [promptKey: string]: Rule<S>;
}

export interface PromptRulesMaker<S extends Promptable> {
    (prompt: Prompt<S>): PromptRules<S>;
}

export type Choice = string; // TODO: eventually this will be something more complex

export type ChoiceList = Choice[];

export interface ChoiceLists {
    [choiceKey: string]: ChoiceList;
}

export class Prompt<S extends Promptable> {
    private promptRules: PromptRules<S>;

    constructor(private chat: ChatConnector, private store: Store<S>, private choiceLists: ChoiceLists, private promptRulesMaker: PromptRulesMaker<S>) {
        this.promptRules = promptRulesMaker(this);
    }

    private set(promptKey: string) {
        this.store.dispatch({ type: 'Set_PromptKey', promptKey });
    }

    private clear() {
        this.set(undefined);
    }

    private recognizer(state: S, message: Message): Entities {
        console.log("recognizer this", this);
        const rule = this.promptRules[state.bot.promptKey];
        if (!rule)
            return null
        return rule.recognizers[0](state, message);
    }

    private handler(store: Store<S>, message: Message, entities: Entities) {
        console.log("handler this.promptRules", this.promptRules);
        this.promptRules[store.getState().bot.promptKey].handler(this.store, message, entities);
        this.clear();
    }

    context(): Context<S> {
        return ({
            query: state => state.bot.promptKey !== undefined,
            rules: [{
                recognizers: [(state, message) => this.recognizer(state, message)],
                handler: (store, message, entities) => this.handler(store, message, entities)
            }]
        });
    }

    // Prompt Creators - eventually the Connectors will have to do some translation of these, somehow

    text(promptKey: string, text: string) {
        this.set(promptKey);
        this.chat.send(text);        
    }

    choice(promptKey: string, choiceName: string, text: string) {
        const choiceList = this.choiceLists[choiceName];
        if (!choiceList)
            return;
        this.set(promptKey);
        this.chat.postActivity({
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

    confirm(promptKey: string, text: string) {
        this.set(promptKey);
        this.chat.postActivity({
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

    // Prompt Recognizers - eventually the Connectors will have to do some translation of these, somehow

    textRecognizer(): Recognizer<S> {
        return (state, message) => ({ text: message.text });
    }

    choiceRecognizer(choiceName: string): Recognizer<S> {
        return (state, message) => {
            const choice = this.choiceLists[choiceName].find(choice => choice.toLowerCase() === message.text.toLowerCase());
            if (choice)
                return { choice };
            else
                return null;
        }
    }

    confirmRecognizer(): Recognizer<S> {
        return (state, message) => {
            const confirm = message.text.toLowerCase() === 'yes'; // TO DO we can do better than this
            if (confirm)
                return { confirm };
            else
                return null;
        }
    }
}