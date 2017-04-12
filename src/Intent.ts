import { Observable } from 'rxjs';
import { Message, Address, getAddress } from './Chat';
import { Store } from 'redux';

export interface Recognizer<S> {
    (message: Message, state?: S): any | Observable<any>;
}

const alwaysRecognize = () => ({});

export interface Handler<S> {
    (message: Message, args?: any, store?: Store<S>): any | Observable<any>;
}

export interface Query<S> {
    (state: S, address?: Address): boolean;
}

export const always = () => true;

export interface Queries<S> {
    [name: string]: Query<S>
}

export interface Rule<S> {
    recognizer: Recognizer<S>;
    handler: Handler<S>;
    name?: string;
}

export const rule = <S>(recognizer: Recognizer<S>, handler: Handler<S>, name?: string): Rule<S> => ({
    recognizer,
    handler,
    name
});

export const defaultRule = <S>(handler: Handler<S>): Rule<S> => rule(alwaysRecognize, handler);

export interface Context<S> {
    query: Query<S>;
    rules: Rule<S>[];
}

export const arrayize = <T>(stuff: T | T[]) => Array.isArray(stuff) ? stuff : [stuff];

export const context = <S>(query: Query<S>, ... rules: (Rule<S> | Rule<S>[])[]): Context<S> => ({
    query,
    rules: [].concat(... rules.map(rule => arrayize(rule)))
})

const true$ = Observable.of(true);
const observerize = <T>(args: T | Observable<T>) => args instanceof Observable ? args : Observable.of(args);

export const runMessage = <S>(store: Store<S>, contexts: Context<S>[], message: Message) => {
    const state = store.getState();
    return Observable.from(contexts)
        .do(context => console.log("context", context))
        .filter(context => context.query(state, getAddress(message)))
        .switchMap(context => Observable.from(context.rules)
            .switchMap(rule => {
                console.log(`running rule ${rule.name}`);
                return observerize(rule.recognizer(message, state))
                .do(_ => console.log(`rule ${rule.name} succeeded!`))
                .filter(args => !!args)
                .do(_ => console.log(`rule ${rule.name} calling handler`))
                .flatMap(args => observerize(rule.handler(message, args, store))
                    .take(1) // because handlers may emit more than one value
                )
            })
            .take(1) // so that we don't keep going through rules
        )
        .take(1) // so that we don't keep going through contexts
}

