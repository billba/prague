import { Observable } from 'rxjs';

export interface ITextSession {
    text: string; // plain text for recognizers that use such things
}

export interface Recognizer<S> {
    (session: S): any | Observable<any>;
}

const alwaysRecognize = () => Observable.of({});

export interface Handler<S> {
    (session: S, args?: any): any | Observable<any>;
}

export interface Query<S> {
    (session: S): boolean;
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

const observerize = <T>(args: T | Observable<T>) => args instanceof Observable ? args : Observable.of(args);

export const runSession = <S>(session: S, contexts: Context<S>[]) => {
    return Observable.from(contexts)
        .do(context => console.log("context", context))
        .filter(context => context.query(session))
        .switchMap(context => Observable.from(context.rules)
            .switchMap(rule => {
                console.log(`running rule ${rule.name}`);
                return observerize(rule.recognizer(session))
                .do(_ => console.log(`rule ${rule.name} succeeded!`))
                .filter(args => !!args)
                .do(_ => console.log(`rule ${rule.name} calling handler`))
                .flatMap(args => observerize(rule.handler(session, args))
                    .do(result => console.log("handler result", result))
                    .take(1) // because handlers may emit more than one value
                )
            })
            .take(1) // so that we don't keep going through rules
        )
        .take(1) // so that we don't keep going through contexts
}

