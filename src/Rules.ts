import { Observable } from 'rxjs';

export type Observizeable<T> = T | Observable<T> | Promise<T>

export interface RuleResult {
    score?: number,
    action: () => Observizeable<any>
}

export interface IRule<M> {
    recognize(match: M): Observable<RuleResult>;
    handle(match: M): Observable<any>;
    prepend<L>(recognizer: Recognizer<L, M>): IRule<L>
}

export interface Match {
    score?: number
}

const minMatch = {
    score: Number.MIN_VALUE
}

export interface Recognizer<A extends Match = Match, Z extends Match = Match> {
    (match: A): Observizeable<Z>;
}

export interface Handler<Z extends Match = Match> {
    (match: Z): Observizeable<any>;
}

export type RecognizerOrHandler = Recognizer | Handler;

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
    abstract recognize(match: M): Observable<RuleResult>;

    handle(match: M): Observable<any> {
        return this.recognize(match)
            .do(result => console.log("handle: got a recognized rule", result))
            .flatMap(result => observize(result.action()))
            .do(_ => console.log("handle: called action"));
    }

    prepend<L>(recognizer: Recognizer<L, M>) {
        return new PrependedRule(recognizer, this);
    }
}

export function combineRecognizers<M extends Match>(... recognizers: Recognizer[]): Recognizer<M, any> {
    return (match) =>
        Observable.from(recognizers)
        .reduce<Recognizer, Observable<Match>>(
            (prevObservable, currentRecognizer, i) =>
                prevObservable
                .flatMap(prevMatch => {
                    console.log(`calling recognizer #${i}`, currentRecognizer);
                    return observize(currentRecognizer(prevMatch)).do(result => console.log("result", result));
                }),
            Observable.of(match)
        )
        .flatMap(omatch => omatch);
}

export class SimpleRule<M extends Match> extends BaseRule<M> {
    private recognizers: Recognizer[];
    private handler: Handler;

    constructor(... args: RecognizerOrHandler[]) {
        super();
        if (args.length === 0) {
            console.error("rules must at least have a handler");
            return;
        }
        this.recognizers = args.slice(0, args.length - 1) as Recognizer[];
        this.handler = args[args.length - 1] as Handler;
    }

    recognize(match: M): Observable<RuleResult> {
        console.log("trying to match a rule");
        return this.recognizers && this.recognizers.length
            ? combineRecognizers(... this.recognizers)(match)
                .do(m => console.log("match", m))
                .map(m => ({
                    score: m.score,
                    action: () => observize(this.handler(m))
                } as RuleResult))
            : Observable.of({
                score: match.score,
                action: () => this.handler(match)
            } as RuleResult);
    }

    prepend<L extends Match>(recognizer: Recognizer<L, M>) {
        return new SimpleRule<L>(
            recognizer,
            ... this.recognizers,
            this.handler
        );
    }
}

export function rule(... args: RecognizerOrHandler[]) {
    return new SimpleRule(... args);
}

export class FirstMatchingRule<M extends Match> extends BaseRule<M> {
    private rule$: Observable<IRule<M>>;

    constructor(... rules: IRule<M>[]) {
        super();
        this.rule$ = Observable.from(rules).filter(rule => !!rule);
    }

    recognize(match: M): Observable<RuleResult> {
        console.log("Rule.first", this.rule$);
        return this.rule$
        .flatMap(
            (rule, i) => {
                console.log(`Rule.first: trying rule #${i}`);
                return rule.recognize(match)
                    .do(m => console.log(`Rule.first: rule #${i} succeeded`, m));
            },
            1
        )
        .take(1) // so that we don't keep going through rules after we find one that matches
    }
}

export function first<M>(... rules: IRule<M>[]) {
    return new FirstMatchingRule(... rules);
}


export interface Predicate<A extends Match> {
    (match: A): Observizeable<boolean>;
}

export interface Predicates<A extends Match> {
    [name: string]: Predicate<A>
}

export function filter<M extends Match>(predicate: Predicate<M>, rule: IRule<M>) {
    return rule.prepend<M>((match) =>
        observize(predicate(match))
        .map(_ => match)
    );
}

export class PrependedRule<L extends Match, M extends Match> extends BaseRule<L> {
    
    // TO DO: let this take multiple recognizers
    constructor(private recognizer: Recognizer<L, M>, private rule: IRule<M>) {
        super();
    }

    recognize(match: L): Observable<RuleResult> {
        return observize(this.recognizer(match))
        .flatMap(m => this.rule.recognize(m));
    }
}

export function prepend<L, M>(recognizer: Recognizer<L, M>, rule: IRule<M>) {
    return rule.prepend(recognizer);
}

export const matchAll = <M extends Match>(match: M) => match;

const passThrough = <M extends Match>(handler: Handler<M>) => (match: M) =>
    observize(handler(match))
    .map(_ => null);

const nullHandler = () => console.warn("this is never actually executed");

export function run<M extends Match>(handler: Handler<M>): IRule<M> {
    return new SimpleRule<M>(
        passThrough(handler),
        nullHandler
    )
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

