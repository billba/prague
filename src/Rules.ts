import { Observable } from 'rxjs';

export type Observizeable<T> = T | Observable<T> | Promise<T>

export interface RuleResult {
    score?: number,
    action: () => Observizeable<any>
}

export interface Match {
    score?: number
}

export interface IRule<M extends Match = Match> {
    tryMatch(match: M): Observable<RuleResult>;
    callHandlerIfMatch(match: M): Observable<any>;
    prependMatcher<L extends Match>(matcher: Matcher<L, M>): IRule<L>
}

const minMatch = {
    score: Number.MIN_VALUE
}

export interface Matcher<A extends Match = Match, Z extends Match = Match> {
    (match: A): Observizeable<Z>;
}

export interface Handler<Z extends Match = Match> {
    (match: Z): Observizeable<any>;
}

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

export abstract class BaseRule<M extends Match> implements IRule<M> {
    abstract tryMatch(match: M): Observable<RuleResult>;

    callHandlerIfMatch(match: M): Observable<any> {
        return this.tryMatch(match)
            .do(result => console.log("handle: matched a rule", result))
            .flatMap(result => observize(result.action()))
            .do(_ => console.log("handle: called action"));
    }

    prependMatcher<L>(matcher: Matcher<L, M>) {
        return new RuleWithPrependedMatcher(matcher, this);
    }
}

export function combineMatchers<M extends Match>(... matchers: Matcher[]): Matcher<M, any> {
    return match =>
        Observable.from(matchers)
        .reduce<Matcher, Observable<Match>>(
            (prevObservable, currentMatcher, i) =>
                prevObservable
                .flatMap(prevMatch => {
                    console.log(`calling matcher #${i}`, currentMatcher);
                    return observize(currentMatcher(prevMatch)).do(result => console.log("result", result));
                }),
            Observable.of(match)
        )
        .flatMap(omatch => omatch);
}

export class SimpleRule<M extends Match> extends BaseRule<M> {
    private matchers: Matcher[];
    private handler: Handler;

    constructor(... args: (Matcher | Handler)[]) {
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
        console.log("trying to match a rule");
        return this.matchers
            ? (combineMatchers<M>(... this.matchers)(match) as Observable<Match>)
                .do(m => console.log("match", m))
                .map(m => ({
                    score: m.score,
                    action: () => this.handler(m)
                } as RuleResult))
            : Observable.of({
                score: match.score,
                action: () => this.handler(match)
            } as RuleResult);
    }

    prependMatcher<L extends Match>(matcher: Matcher<L, M>) {
        return new SimpleRule<L>(
            matcher,
            ... this.matchers,
            this.handler
        );
    }
}

export class FirstMatchingRule<M extends Match> extends BaseRule<M> {
    private rule$: Observable<IRule<M>>;

    constructor(... rules: IRule<M>[]) {
        super();
        this.rule$ = Observable.from(rules).filter(rule => !!rule);
    }

    tryMatch(match: M): Observable<RuleResult> {
        console.log("Rule.first", this.rule$.toArray());
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

export class RuleWithPrependedMatcher<L extends Match, M extends Match> extends BaseRule<L> {
    
    // TO DO: let this take multiple matchers
    constructor(private matcher: Matcher<L, M>, private rule: IRule<M>) {
        super();
    }

    tryMatch(match: L): Observable<RuleResult> {
        return observize(this.matcher(match))
        .flatMap(m => this.rule.tryMatch(m));
    }
}

export class RunRule<M extends Match> extends BaseRule<M> {
    constructor(private handler: Handler<M>) {
        super();
    }

    tryMatch(match: M): Observable<RuleResult> {
        return observize(this.handler(match))
        .map(_ => null);
    }
}

// These are left over from previous versions of the API and need to be updated to the latest hotness

// static best$<M extends Match>(rule$: Observable<Rule<M>>): Rule<M> {
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

// static best<M extends Match>(... rules: Rule<M>[]): Rule<M> {
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

export interface Predicate<M extends Match> {
    (match: M): Observizeable<boolean>;
}

export interface Predicates<M extends Match> {
    [name: string]: Predicate<M>
}

export const Helpers = <M extends Match>() => {
    // helpers are first defined as local variables so that they can call each other if necessary

    function rule(handler: Handler<M>)
    function rule<Z extends Match>(m1: Matcher<M, Z>, handler: Handler<Z>)
    function rule<N extends Match, Z extends Match>(m1: Matcher<M, N>, m2: Matcher<N, Z>, handler: Handler<Z>)
    function rule<N extends Match, O extends Match, Z extends Match>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, Z>, handler: Handler<Z>)
    function rule<N extends Match, O extends Match, P extends Match, Z extends Match>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, Z>, m4: Matcher<P, Z>, handler: Handler<Z>)
    function rule<N extends Match, O extends Match, P extends Match, Q extends Match, Z extends Match>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, Z>, m4: Matcher<P, Q>, m5: Matcher<Q, Z>, handler: Handler<Z>)
    function rule<A>(... args: (Matcher | Handler)[]) {
        return new SimpleRule(... args) as IRule<M>;
    }

    const first = (... rules: IRule<M>[]) => new FirstMatchingRule(... rules) as IRule<M>;

    const run = (handler: Handler<M>) => new RunRule<M>(handler) as IRule<M>;

    const matchAlways = (match: M) => match;

    const matchPredicate = (predicate: Predicate<M>) =>
        match =>
            observize(predicate(match))
            .map(_ => match);

    const filter = (predicate: Predicate<M>, rule: IRule<M>) =>
        rule.prependMatcher<M>(matchPredicate(predicate));

    function prepend<L extends Match>(m1: Matcher<L, M>, rule: IRule<M>)
    function prepend<K extends Match, L extends Match>(m1: Matcher<K, L>, m2: Matcher<L, M>, rule: IRule<M>)
    function prepend<J extends Match, K extends Match, L extends Match>(m1: Matcher<J, K>, m2: Matcher<K, L>, m3: Matcher<L, M>, rule: IRule<M>)
    function prepend<I extends Match, J extends Match, K extends Match, L extends Match>(m1: Matcher<I, J>, m2: Matcher<J, K>, m3: Matcher<K, L>, m4: Matcher<L, M>, rule: IRule<M>)
    function prepend<H extends Match, I extends Match, J extends Match, K extends Match, L extends Match>(m1: Matcher<H, I>, m2: Matcher<I, J>, m3: Matcher<J, K>, m4: Matcher<K, L>, m5: Matcher<L, M>, rule: IRule<M>)
    function prepend<L extends Match>(matcher: Matcher<L>, ... args: (Matcher | IRule)[]) {
        return (args[args.length - 1] as IRule).prependMatcher(combineMatchers(matcher, ... args.slice(0, args.length - 1) as Matcher[]));
    }

    return {
        rule,
        first,
        run,
        matchAlways,
        matchPredicate,
        filter,
        prepend,
    }
}
