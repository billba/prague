import { Observable } from 'rxjs';

export interface ITextInput {
    text: string; // plain text for matchers that use such things
}

export type Result<T> = T | Observable<T> | Promise<T>

export interface Matcher<S> {
    (input: S): Result<any>; // When we have default generics the result will be typed
}

export const always = <S>(input: S) => Observable.of(true);

export interface Action<S> {
    (input: S, args?: any): Result<any>; // When we have default generics the result will be typed
}

export interface Rule<S> {
    matcher: Matcher<S>;
    action: Action<S>;
    name?: string;
}

export const rule = <S>(matcher: Matcher<S>, action: Action<S>, name?: string): Rule<S> => ({
    matcher,
    action,
    name
});

export const defaultRule = <S>(action: Action<S>): Rule<S> => rule(always, action);

export const arrayize = <T>(stuff: T | T[]) => Array.isArray(stuff) ? stuff : [stuff];

const observize = <T>(t: Result<T>) => {
    if (t instanceof Observable)
        return t;
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t)
    return Observable.of(t)
}

export const doMatcher = <S>(input: S, matcher: Matcher<S>) => 
    observize(matcher(input))
    .filter(result => !!result)
    .do(args => console.log("matcher result", args));

export const doAction = <S>(input: S, args: Observable<any>, action: Action<S>) =>  {
    console.log(`resolving action`);

    return observize(action(input, args))
    .do(result => console.log("action result", result))
    .take(1); // because actions may emit more than one value
}

export const executeRule = <S>(input: S, rule: Rule<S>) =>
    doMatcher(input, rule.matcher)
    .do(args => console.log(`rule ${rule.name} succeeded!`, args))
    .flatMap(args => doAction(input, args, rule.action));

export const firstMatcher = <S>(... rules: Rule<S>[]): Rule<S> => ({
    matcher: (input) => 
        Observable.from(rules)
        .switchMap((rule, index) => {
            console.log(`evaluating ${rule.name}`);

            return doMatcher(input, rule.matcher)
            .map(args => ({index, args}));
        })
        .take(1), // so that we don't keep going through rules
    action: (input, args: { index: number, args: any }) => rules[args.index].action(input, args.args),
    name: `firstMatcher of ${rules.length} rules`
});

export const bestMatcher = <S>(... rules: Rule<S>[]) => {
    // This will require the ability to score individual rules
}

export interface Query<S> {
    (input: S): Result<boolean>;
}

export interface Queries<S> {
    [name: string]: Query<S>
}

export const filter = <S>(query: Query<S>, rule: Rule<S>): Rule<S> => ({
    matcher: (input) =>
        observize(query(input))
        .filter(result => !!result)
        .do(_ => console.log(""))
        .flatMap(_ => doMatcher(input, rule.matcher)),
    action: rule.action,
    name: `filter rule ${rule.name}`
});