import { ChatConnector } from './Chat';
import { Store } from 'redux';
import { Message, CardAction } from 'botframework-directlinejs';

// Eventually we'll probably want to turn this into a selector function instead of a hardwired interface definition
export interface Promptable {
    bot: {
        promptKey: string;
    }
}

export interface Responder {
    (answer: Message): boolean;
}

export interface Responders {
    [promptKey: string]: Responder;
}

export interface RespondersFactory<S extends Promptable> {
    (prompt: Prompt<S>): Responders;
}

export type Choice = string; // TODO: eventually this will be something more complex

export type ChoiceList = Choice[];

export interface ChoiceLists {
    [choiceKey: string]: ChoiceList;
}

export class Prompt<S extends Promptable> {
    private responders: Responders;

    constructor(private chat: ChatConnector, private store: Store<S>, private choiceLists: ChoiceLists, private respondersFactory: RespondersFactory<S>) {
        this.responders = respondersFactory(this);
    }

    set(promptKey: string) {
        this.store.dispatch({ type: 'Set_PromptKey', promptKey });
    }

    private clear() {
        this.set(undefined);
    }

    respond(message: Message) {
        const state = this.store.getState().bot;

        if (!this.store.getState().bot.promptKey)
            return false;

        const responder = this.responders[state.promptKey];

        if (responder && responder(message))
            this.clear();

        return true;
    }

    // Prompt Creators - eventually the Connectors will have to do some translation of these, somehow

    text(prompt: string, text: string) {
        this.set(prompt);
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

    // Prompt Responders - eventually the Connectors will have to do some translation of these, somehow

    choiceResponder(choiceName: string, responder: (choice: Choice) => boolean): Responder {
        return message => {
            const choice = this.choiceLists[choiceName].find(choice => choice.toLowerCase() === message.text.toLowerCase());
            return responder(choice);
        }
    }

    confirmResponder(responder: (confirmed: boolean) => boolean): Responder {
        return message => responder(message.text.toLowerCase() === 'yes');
    }
}