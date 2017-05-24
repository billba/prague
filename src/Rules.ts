import { Observable } from 'rxjs';

export type Observizeable<T> = T | Observable<T> | Promise<T>

export interface RuleResult {
    score?: number,
    action: () => Observizeable<any>
}

export interface Match {
    score?: number
}

export interface IRule<M extends Match = any> {
    tryMatch(match: M): Observable<RuleResult>;
    callHandlerIfMatch(match: M): Observable<any>;
    prependMatcher<L extends Match = any>(matcher: Matcher<L, M>): IRule<L>
}

const minMatch = {
    score: Number.MIN_VALUE
}

export type Matcher<A extends Match = any, Z extends Match = any> = (match: A) => Observizeable<Z>;

export type Handler<Z extends Match = any> = (match: Z) => Observizeable<any>;

export const arrayize = <T>(stuff: T | T[]) => Array.isArray(stuff) ? stuff : [stuff];

export const observize = <T>(t: Observizeable<T>) => {
    if (!t)
        return Observable.empty<T>();
    if (t instanceof Observable)
        return t.filter(i => !!i);
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t).filter(i => !!i);
    return Observable.of(t);
}

export function isRule<M>(r: IRule<M> | Handler<M>): r is IRule<M> {
    return ((r as any).tryMatch !== undefined);
}

export const ruleize = <M extends Match = any>(r: IRule<M> | Handler<M>) => {
    return isRule(r) ? r : new SimpleRule(r) as IRule<M>;
}

export const matchize = <M extends Match = any>(matcher: Matcher<M>, match: M) => {
    // we want to allow any matcher to be a predicate (return a boolean)
    // if so, the 'falsey' case will be filtered out by observize,
    // so we just need to catch the case where it is precisely true
    return observize(matcher(match))
        .map(m => typeof(m) === 'boolean' ? match : m);
}

export abstract class BaseRule<M extends Match = any> implements IRule<M> {
    abstract tryMatch(match: M): Observable<RuleResult>;

    callHandlerIfMatch(match: M): Observable<any> {
        return this.tryMatch(match)
            .do(result => console.log("handle: matched a rule", result))
            .flatMap(result => observize(result.action()))
            .do(_ => console.log("handle: called action"));
    }

    prependMatcher<L>(matcher: Matcher<L, M>): IRule<L> {
        return new RuleWithPrependedMatcher(matcher, this);
    }
}

export function combineMatchers<M extends Match = any, N extends Match = any>(m1: Matcher<M, N>): Matcher<M, N>
export function combineMatchers<M extends Match = any, N extends Match = any, O extends Match = any>(m1: Matcher<M, N>, m2: Matcher<N, O>): Matcher<M, O>
export function combineMatchers<M extends Match = any, N extends Match = any, O extends Match = any, P extends Match = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, P>): Matcher<M, P>
export function combineMatchers<M extends Match = any, N extends Match = any, O extends Match = any, P extends Match = any, Q extends Match = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, P>, m4: Matcher<P, Q>): Matcher<M, Q>
export function combineMatchers<M extends Match = any>(... matchers: Matcher[]): Matcher<M, any>
export function combineMatchers<M extends Match = any>(... args: Matcher[]): Matcher<M, any> {
    console.log("combineMatchers", args);
    return match =>
        Observable.from(args)
        .reduce<Matcher, Observable<Match>>(
            (prevObservable, currentMatcher, i) =>
                prevObservable
                .flatMap(prevMatch => {
                    console.log(`calling matcher #${i}`, currentMatcher);
                    return matchize(currentMatcher, prevMatch)
                        .do(result => console.log("result", result));
                }),
            Observable.of(match)
        )
        .flatMap(omatch => omatch);
}

export class SimpleRule<M extends Match = any> extends BaseRule<M> {
    private matchers: Matcher[] = [];
    private handler: Handler;

    constructor(... args: (Matcher | Predicate | Handler)[]) {
        super();
        if (args.length < 1) {
            console.error("rules must at least have a handler");
            return;
        }
        if (args.length > 1)
            this.matchers = args.slice(0, args.length - 1) as Matcher[];
        this.handler = args[args.length - 1] as Handler;
    }

    tryMatch(match: M): Observable<RuleResult> {
        console.log("SimpleRule.tryMatch", this.matchers);
        
        if (this.matchers.length === 0)
            return Observable.of({
                score: match.score,
                action: () => this.handler(match)
            } as RuleResult);
        
        return (
            this.matchers.length === 1
                ? matchize(this.matchers[0], match)
                : combineMatchers<M>(... this.matchers)(match) as Observable<Match>
            )
            .do(m => console.log("match", m))
            .map(m => ({
                score: m.score,
                action: () => this.handler(m)
            } as RuleResult));
    }

    prependMatcher<L extends Match = any>(matcher: Matcher<L, M>) {
        console.log("SimpleRule.prependMatcher", matcher);
        return new SimpleRule<L>(
            matcher,
            ... this.matchers,
            this.handler
        );
    }
}

export class FirstMatchingRule<M extends Match = any> extends BaseRule<M> {
    private rule$: Observable<IRule<M>>;

    constructor(... rules: (IRule<M> | Handler<M>)[]) {
        super();
        console.log("FirstMatchingRule.constructor: rules", rules);
        this.rule$ = Observable.from(rules)
            .filter(rule => !!rule)
            .map(rule => ruleize(rule));
    }

    tryMatch(match: M): Observable<RuleResult> {
        console.log("FirstMatchingRule.tryMatch", match);
        return this.rule$
        .flatMap(
            (rule, i) => {
                console.log(`Rule.first: trying rule #${i}`);
                return rule.tryMatch(match)
                    .do(m => console.log(`Rule.first: rule #${i} succeeded`, m));
            },
            1
        )
        .take(1) // so that we don't keep going through rules after we find one that matches
    }
}

export class RuleWithPrependedMatcher<L extends Match = any, M extends Match = any> extends BaseRule<L> {
    
    // TO DO: let this take multiple matchers
    constructor(private matcher: Matcher<L, M>, private rule: IRule<M>) {
        super();
    }

    tryMatch(match: L): Observable<RuleResult> {
        return matchize(this.matcher, match)
            .flatMap((m: M) => this.rule.tryMatch(m));
    }
}

export class RunRule<M extends Match = any> extends BaseRule<M> {
    constructor(private handler: Handler<M>) {
        super();
    }

    tryMatch(match: M): Observable<RuleResult> {
        return observize(this.handler(match))
        .map(_ => null);
    }
}

// These are left over from previous versions of the API and need to be updated to the latest hotness

// static best$<M extends Match = any>(rule$: Observable<Rule<M>>): Rule<M> {
//     return new Rule<M>(
//         (match: M) =>
//             rule$
//             .do(_ => console.log("Rule.best: trying rule"))
//             .flatMap(rule =>
//                 rule.recognize(match)
//                 .map(match => ({
//                     ... match,
//                     handler: rule.handler
//                 }))
//             )
//             .reduce<Match>((prev, current) => Math.min(prev.score || 1, 1) > Math.min(current.score || 1, 1) ? prev : current, minMatch)
//             .takeWhile(match => match.score && match.score < 1),
//         (match: M & { handler: GenericHandler }) =>
//             match.handler(match)
//     );
// }

// static best<M extends Match = any>(... rules: Rule<M>[]): Rule<M> {
//     return Rule.first$(Observable.from(rules).filter(rule => !!rule));
// }

// export const everyMatch$ = <S>(rule$: Observable<Rule<S>>, scoreThreshold = 0) => (input) =>
//     rule$
//     .do(_ => console.log("everyMatch$: trying rule"))
//     .flatMap(rule => observize(rule(input)))
//     .reduce((prev, current) => (current.score || 1) < scoreThreshold ? prev : {
//         action: prev
//             ? () => observize(prev.action()).flatMap(_ => observize(current.action()))
//             : () => current.action()
//         }
//     );

export interface Predicate<M extends Match = any> {
    (match: M): Observizeable<boolean>;
}

export function rule<M extends Match = any>(handler: Handler<M> | IRule<M>)

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
    const ruleOrHandler = args[args.length - 1] as Handler | IRule;
    if (isRule(ruleOrHandler)) {
        switch (args.length) {
            case 1:
                return ruleOrHandler;
            case 2:
                return ruleOrHandler.prependMatcher(args[0] as Matcher);
            default:
                return ruleOrHandler.prependMatcher(combineMatchers(... args.slice(0, args.length - 1) as Matcher[]));
        }
    }
    return new SimpleRule(... args as Matcher[]) as IRule<M>;
}

export const first = <M extends Match = any>(... rules: (IRule<M> | Handler<M>)[]) => new FirstMatchingRule(... rules) as IRule<M>;

export const run = <M extends Match = any>(handler: Handler<M>) => new RunRule<M>(handler) as IRule<M>;
