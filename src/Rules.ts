import { Observable } from 'rxjs';

export interface ITextSession {
    text: string; // plain text for recognizers that use such things
}

export type Result<T> = T | Observable<T> | Promise<T>

export interface Recognizer<S> {
    (session: S): Result<any>; // When we have default generics the result will be typed
}

export const always = <S>(session: S) => Observable.of(true);

export interface Handler<S> {
    (session: S, args?: any): Result<any>; // When we have default generics the result will be typed
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

export const defaultRule = <S>(handler: Handler<S>): Rule<S> => rule(always, handler);

export const arrayize = <T>(stuff: T | T[]) => Array.isArray(stuff) ? stuff : [stuff];

const observize = <T>(t: Result<T>) => {
    if (t instanceof Observable)
        return t;
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t)
    return Observable.of(t)
}

export const runRecognizer = <S>(session: S, recognizer: Recognizer<S>) => 
    observize(recognizer(session))
    .filter(result => !!result)
    .do(args => console.log("recognizer result", args));

export const runHandler = <S>(session: S, args: Observable<any>, handler: Handler<S>) =>  {
    console.log(`resolving handler`);

    return observize(handler(session, args))
    .do(result => console.log("handler result", result))
    .take(1); // because handlers may emit more than one value
}

export const executeRule = <S>(session: S, rule: Rule<S>) =>
    runRecognizer(session, rule.recognizer)
    .do(args => console.log(`rule ${rule.name} succeeded!`, args))
    .flatMap(args => runHandler(session, args, rule.handler));

export const firstMatch = <S>(... rules: Rule<S>[]): Rule<S> => ({
    recognizer: (session) => 
        Observable.from(rules)
        .switchMap((rule, index) => {
            console.log(`evaluating ${rule.name}`);

            return runRecognizer(session, rule.recognizer)
            .map(args => ({index, args}));
        })
        .take(1), // so that we don't keep going through rules
    handler: (session, args: { index: number, args: any }) => rules[args.index].handler(session, args.args),
    name: `firstMatch of ${rules.length} rules`
});

export const bestMatch = <S>(... rules: Rule<S>[]) => {
    // This will require the ability to score individual rules
}

export interface Query<S> {
    (session: S): Result<boolean>;
}

export interface Queries<S> {
    [name: string]: Query<S>
}

export const filter = <S>(query: Query<S>, rule: Rule<S>): Rule<S> => ({
    recognizer: (session) =>
        observize(query(session))
        .filter(result => !!result)
        .do(_ => console.log(""))
        .flatMap(_ => runRecognizer(session, rule.recognizer)),
    handler: rule.handler,
    name: `filter rule ${rule.name}`
});