import { Observable } from 'rxjs';

export interface IInputSource<S> {
    input$: Observable<S>;
}

export type Observizeable<T> = T | Observable<T> | Promise<T>

export interface Action<S> {
    (input: S, args?: any): Observizeable<any>; // When we have default generics the args & result will be typed too
}

export interface Match {
    score?: number,
    action: () => Observizeable<any>;
}

export interface Rule<S> {
    (input: S): Observizeable<Match>;
}

export const defaultRule = <S>(action: Action<S>): Rule<S> => (input: S) => ({
    action: () => action(input)
});

export const arrayize = <T>(stuff: T | T[]) => Array.isArray(stuff) ? stuff : [stuff];

export const observize = <T>(t: Observizeable<T>) => {
    if (t instanceof Observable)
        return t;
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t)
    if (t === undefined || t === null)
        return Observable.empty();
    return Observable.of(t)
}

export const composeRule = <S>(rule: Rule<S>): Rule<S> => (input) =>
    observize(rule(input))
    .flatMap(match => observize(match.action()));

export const doRule = <S>(input: S, rule: Rule<S>) =>
    observize(rule(input))
    .flatMap(match => observize(match.action()));

export const firstMatch$ = <S>(rule$: Observable<Rule<S>>): Rule<S> => (input) => 
    rule$
    .do(_ => console.log("firstMatch: trying rule"))
    .switchMap(rule => observize(rule(input)))
    .take(1); // so that we don't keep going through rules

export const firstMatch = <S>(... rules: Rule<S>[]): Rule<S> => (input) =>
    firstMatch$(Observable.from(rules))(input);

export const bestMatch$ = <S>(rule$: Observable<Rule<S>>) => (input) => 
    rule$
    .do(_ => console.log("bestMatch$: trying rule"))
    .flatMap(rule => observize(rule(input)))
    .takeWhile(match => match.score < 1)
    .reduce<Match>((prev, current) => prev && Math.max(prev.score || 1, 1) > Math.max(current.score || 1, 1) ? prev : current);
    // TODO: don't call reduce if current.score >= 1

export const bestMatch = <S>(... rules: Rule<S>[]) => (input) => 
    bestMatch$(Observable.from(rules))(input);

export interface Query<S> {
    (input: S): Observizeable<boolean>;
}

export interface Queries<S> {
    [name: string]: Query<S>
}

export const filter = <S>(query: Query<S>, rule: Rule<S>): Rule<S> => (input) => 
    observize(query(input))
    .filter(result => !!result)
    .flatMap(_ => observize(rule(input)));
