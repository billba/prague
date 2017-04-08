import { Observable } from 'rxjs';
import { Message } from 'botframework-directlinejs';
import { Store } from 'redux';

export interface Entities {
    [name: string]: any;
}

export interface Recognizer<S> {
    (state: S, message: Message): Entities | Observable<Entities>;
}

const alwaysRecognize = () => ({});

export interface Handler<S> {
    (store: Store<S>, message: Message, entities: Entities): void | Observable<void>;
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

const false$ = Observable.of(false);
const true$ = Observable.of(true);

export class IntentEngine<S> {
    constructor(private store: Store<S>, private contexts: Context<S>[]) {
    }

    runMessage(message: Message) {
        const state = this.store.getState();
        return Observable.from(this.contexts)
        .filter(context => context.query(state))
        .concatMap(context => Observable.from(context.rules))
        .concatMap(rule => Observable.from(rule.recognizers)
            .concatMap(recognizer => {
                const entities = recognizer(state, message);
                console.log("recognizer", entities);
                return entities instanceof Observable ? entities : Observable.of(entities);
            })
            .filter(entities => !!entities)
            .flatMap<Entities, boolean>(entities => {
                const result = rule.handler(this.store, message, entities);
                console.log("handler", result);
                return result instanceof Observable ? result.mapTo(true$) : true$;
            })
        )
        .first(result => result, null, false)
    }
}
