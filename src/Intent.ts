import { Message } from 'botframework-directlinejs';
import { Store } from 'redux';

export interface Entities {
    [name: string]: any;
}

export interface Recognizer<S> {
    (state: S, message: Message): Entities;
}

const alwaysRecognize = () => ({});

export interface Handler<S> {
    (store: Store<S>, message: Message, entities: Entities): void;
}

export interface Query<S> {
    (state: S): boolean;
}

export const always = () => true;

export interface Queries<S> {
    [name: string]: Query<S>
}

export interface Rule<S> {
    recognizers: Recognizer<S>[];
    handler: Handler<S>;
}

export const rule = <S>(recognizer: Recognizer<S>, handler: Handler<S>) => ({
    recognizers: [recognizer],
    handler
});

export const defaultRule = <S>(handler: Handler<S>): Rule<S> => rule(alwaysRecognize, handler);

export interface Context<S> {
    query: Query<S>;
    rules: Rule<S>[];
}

export const context = <S>(query: Query<S>, ... rules: (Rule<S> | Rule<S>[])[]): Context<S> => ({
    query,
    rules: [].concat(... rules.map(rule => (Array.isArray(rule) ? rule : [rule])))
})


export class IntentEngine<S> {
    constructor(private store: Store<S>, private contexts: Context<S>[]) {
    }

    public runMessage(message: Message) {
        const state = this.store.getState();
        for (const context of this.contexts) {
            if (context.query(state)) {
                for (const rule of context.rules) {
                    for (const recognizer of rule.recognizers) {
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
