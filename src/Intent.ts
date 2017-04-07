import { Message } from 'botframework-directlinejs';
import { Store } from 'redux';

export interface Entities {
    [name: string]: any;
}

export interface Recognizer<S> {
    (state: S, message: Message): Entities;
}

export interface Handler<S> {
    (store: Store<S>, message: Message, entities: Entities): void;
}

export interface Query<S> {
    (state: S): boolean;
}

export interface Queries<S> {
    [name: string]: Query<S>
}

export interface Rule<S> {
    recognizers: Recognizer<S>[];
    handler: Handler<S>;
}

export interface Context<S> {
    query: Query<S>;
    rules: Rule<S>[];
}

export class App<S> {
    constructor(private store: Store<S>, private contexts: Context<S>[]) {
    }

    public runMessage(message: Message) {
        const state = this.store.getState();
        for (const context of this.contexts) {
            if (context.query(state)) {
                for (const rule of context.rules) {
                    const recognizers = rule.recognizers;
                    if (!recognizers || recognizers.length === 0) {
                        // handler always executes if there are no recognizers
                        rule.handler(this.store, message, null);
                        return true;
                    }
                    for (const recognizer of recognizers) {
                        const entities = recognizer(state, message);
                        if (entities) {
                            rule.handler(this.store, message, entities);
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
}

export const context = <S>(query: Query<S>, rules: Rule<S> | Rule<S>[]): Context<S> => ({
    query,
    rules: (Array.isArray(rules) ? rules : [rules])
})

export const always = () => true;

export const defaultRule = <S>(handler: Handler<S>): Rule<S> => ({
    recognizers: null,
    handler
})
