import { konsole } from './Konsole';
import { Observable } from 'rxjs';

export type Observableable<T> = T | Observable<T> | Promise<T>

export interface RuleResult {
    score?: number,
    action: () => Observableable<any>
}

export interface Match {
    score?: number
}

export interface IRule<M extends Match = any> {
    tryMatch(match: M): Observable<RuleResult>;
}

export type Matcher<A extends Match = any, Z extends Match = any> = (match: A) => Observableable<Z>;

export type Handler<Z extends Match = any> = (match: Z) => Observableable<any>;

export const arrayize = <T>(stuff: T | T[]) => Array.isArray(stuff) ? stuff : [stuff];

export const toFilteredObservable = <T>(t: Observableable<T>) => {
    if (!t)
        return Observable.empty<T>();
    if (t instanceof Observable)
        return t.filter(i => !!i);
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t).filter(i => !!i);
    return Observable.of(t);
}

export const toObservable = <T>(t: Observableable<T>) => {
    if (t instanceof Observable)
        return t;
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t);
    return Observable.of(t);
}

export function isRule<M>(r: IRule<M> | Handler<M>): r is IRule<M> {
    return ((r as any).tryMatch !== undefined);
}

export const ruleize = <M extends Match = any>(r: IRule<M> | Handler<M>) => {
    return isRule(r) ? r : simpleRule(r);
}

export const matchize = <M extends Match = any>(matcher: Matcher<M>, match: M) => {
    // we want to allow any matcher to be a predicate (return a boolean)
    // if so, the 'falsey' case will be filtered out by toFilteredObservable,
    // so we just need to catch the case where it is precisely true
    return toFilteredObservable(matcher(match))
        .map(m => typeof m === 'boolean' ? match : m);
}

export const callActionIfMatch = <M extends Match = any>(match: M, rule: IRule<M>) => 
    rule.tryMatch(match)
        .do(result => konsole.log("handle: matched a rule", result))
        .flatMap(result => toObservable(result.action()))
        .do(_ => konsole.log("handle: called action"));

export function combineMatchers<M extends Match = any, N extends Match = any>(m1: Matcher<M, N>): Matcher<M, N>
export function combineMatchers<M extends Match = any, N extends Match = any, O extends Match = any>(m1: Matcher<M, N>, m2: Matcher<N, O>): Matcher<M, O>
export function combineMatchers<M extends Match = any, N extends Match = any, O extends Match = any, P extends Match = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, P>): Matcher<M, P>
export function combineMatchers<M extends Match = any, N extends Match = any, O extends Match = any, P extends Match = any, Q extends Match = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, P>, m4: Matcher<P, Q>): Matcher<M, Q>
export function combineMatchers<M extends Match = any>(... matchers: Matcher[]): Matcher<M, any>
export function combineMatchers<M extends Match = any>(... args: Matcher[]): Matcher<M, any> {
    konsole.log("combineMatchers", args);
    return match =>
        Observable.from(args)
        .reduce<Matcher, Observable<Match>>(
            (prevObservable, currentMatcher, i) =>
                prevObservable
                .flatMap(prevMatch => {
                    konsole.log(`calling matcher #${i}`, currentMatcher);
                    return matchize(currentMatcher, prevMatch)
                        .do(result => konsole.log("result", result));
                }),
            Observable.of(match)
        )
        .flatMap(omatch => omatch);
}

export const simpleRule = <M extends Match = any>(handler: Handler<M>) => ({
    tryMatch: (match: M) => Observable.of({
        score: match.score,
        action: () => handler(match)
    } as RuleResult)
}) as IRule<M>;

const filteredRule$ = <M extends Match = any>(... rules: (IRule<M> | Handler<M>)[]) =>
    Observable.from(rules)
        .filter(rule => !!rule)
        .map(rule => ruleize(rule));

export const first = <M extends Match = any>(... rules: (IRule<M> | Handler<M>)[]) => {
    const rule$ = filteredRule$(... rules);

    return {
        tryMatch: (match: M) =>
            rule$.flatMap(
                (rule, i) => {
                    konsole.log(`Rule.first: trying rule #${i}`);
                    return rule.tryMatch(match)
                        .do(m => konsole.log(`Rule.first: rule #${i} succeeded`, m));
                },
                1
            )
            .take(1) // so that we don't keep going through rules after we find one that matches
    } as IRule<M>;
}

const minRuleResult: RuleResult = {
    score: 0,
    action: () => console.log("This should never be called")
}

export const best = <M extends Match = any>(... rules: (IRule<M> | Handler<M>)[]) => {
    const rule$ = filteredRule$(... rules);

    return {
        tryMatch: (match: M) =>
            rule$.flatMap(
                (rule, i) => {
                    konsole.log(`Rule.best: trying rule #${i}`);
                    return rule.tryMatch(match)
                        .do(m => konsole.log(`Rule.best: rule #${i} succeeded`, m));
                }
            )
            .reduce(
                (prev, current) => Math.min(prev.score === undefined ? 1 : prev.score) > Math.min(current.score === undefined ? 1 : current.score) ? prev : current,
                minRuleResult
            )
            // .takeWhile(ruleResult => ruleResult.score && ruleResult.score < 1)
    } as IRule<M>;
}

export const prependMatcher = <L extends Match = any, M extends Match = any>(matcher: Matcher<L, M>, rule: IRule<M>) => ({
    tryMatch: (match: L) =>
        matchize(matcher, match)
            .flatMap((m: M) => rule.tryMatch(m))
    } as IRule<L>);

export const run = <M extends Match = any>(handler: Handler<M>) => ({
    tryMatch: (match: M) =>
        toObservable(handler(match))
        .map(_ => null)
    } as IRule<M>);

// These are left over from previous versions of the API and need to be updated to the latest hotness

// export const everyMatch$ = <S>(rule$: Observable<Rule<S>>, scoreThreshold = 0) => (input) =>
//     rule$
//     .do(_ => konsole.log("everyMatch$: trying rule"))
//     .flatMap(rule => observize(rule(input)))
//     .reduce((prev, current) => (current.score || 1) < scoreThreshold ? prev : {
//         action: prev
//             ? () => observize(prev.action()).flatMap(_ => observize(current.action()))
//             : () => current.action()
//         }
//     );

export interface Predicate<M extends Match = any> {
    (match: M): Observableable<boolean>;
}

export function rule<M extends Match = any>(handler: Handler<M> | IRule<M>): IRule<M>

export function rule<M extends Match = any>(p1: Predicate<M>, handler: Handler<M> | IRule<M>): IRule<M>
export function rule<M extends Match = any, Z extends Match = any>(m1: Matcher<M, Z>, handler: Handler<Z> | IRule<Z>): IRule<M>

export function rule<M extends Match = any, Z extends Match = any>(p1: Predicate<M>, m2: Matcher<M, Z>, handler: Handler<Z> | IRule<Z>): IRule<M>
export function rule<M extends Match = any, Z extends Match = any>(m1: Matcher<M, Z>, p2: Predicate<Z>, handler: Handler<Z> | IRule<Z>): IRule<M>
export function rule<M extends Match = any, N extends Match = any, Z extends Match = any>(m1: Matcher<M, N>, m2: Matcher<N, Z>, handler: Handler<Z> | IRule<Z>): IRule<M>

export function rule<M extends Match = any, Z extends Match = any>(m1: Matcher<M, Z>, p2: Predicate<Z>, p3: Predicate<Z>, handler: Handler<Z> | IRule<Z>): IRule<M>
export function rule<M extends Match = any, Z extends Match = any>(p1: Matcher<M>, m2: Matcher<M, Z>, p3: Predicate<Z>, handler: Handler<Z> | IRule<Z>): IRule<M>
export function rule<M extends Match = any, Z extends Match = any>(p1: Predicate<M>, p2: Predicate<M>, m3: Matcher<M, Z>, handler: Handler<Z> | IRule<Z>): IRule<M>
export function rule<M extends Match = any, N extends Match = any, Z extends Match = any>(p1: Predicate<M>, m2: Matcher<M, N>, m3: Matcher<N, Z>, handler: Handler<Z> | IRule<Z>): IRule<M>
export function rule<M extends Match = any, N extends Match = any, Z extends Match = any>(m1: Matcher<M, N>, p2: Predicate<N>, m3: Matcher<N, Z>, handler: Handler<Z> | IRule<Z>): IRule<M>
export function rule<M extends Match = any, N extends Match = any, Z extends Match = any>(m1: Matcher<M, N>, m2: Matcher<N, Z>, p3: Predicate<Z>, handler: Handler<Z> | IRule<Z>): IRule<M>
export function rule<M extends Match = any, N extends Match = any, O extends Match = any, Z extends Match = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, Z>, handler: Handler<Z> | IRule<Z>): IRule<M>

export function rule<M extends Match = any>(... args: (Predicate | Matcher | Handler | IRule)[]): IRule<M> {
    const ruleOrHandler = ruleize(args[args.length - 1] as Handler | IRule);
    switch (args.length) {
        case 1:
            return ruleOrHandler;
        case 2:
            return prependMatcher(args[0] as Matcher, ruleOrHandler);
        default:
            return prependMatcher(combineMatchers(... args.slice(0, args.length - 1) as Matcher[]), ruleOrHandler);
    }
}
