import { Observable, from as observableFrom, of as observableOf } from 'rxjs';
import { take, map, flatMap, filter, defaultIfEmpty } from 'rxjs/operators';

export type BaseType <T> =
    T extends Observable<infer BASETYPE> ? BASETYPE :
    T extends Promise<infer BASETYPE> ? BASETYPE :
    T;

export type Observableable<T> = Observable<T> | Promise<T> | T;

export const toObservable = <T> (
    t: Observableable<T>,
) =>
    t instanceof Observable ? t.pipe(take(1)) :
    t instanceof Promise ? observableFrom(t) :
    observableOf(t);

export abstract class Result {

    score: number;

    constructor(score?: number) {
        this.score = Result.normalizedScore(score);
    }

    static normalizedScore (
        score?: number,
    ) {
        return score != null && score >= 0 && score < 1
            ? score
            : 1;
    }

    cloneWithScore (
        score?: number,
    ): this {

        score = Result.normalizedScore(score);

        return score === this.score
            ? this
            : Object.assign(Object.create(this.constructor.prototype), this, { score });
    }
}

export class NoResult {
    private value = "No Result";

    private constructor() {
    }

    static singleton = new NoResult();

    static transform = () => observableOf(NoResult.singleton);

    static filterOut = filter<Result>((o: Output) => o !== NoResult.singleton);

    static defaultIfEmpty = defaultIfEmpty(NoResult.singleton);
}

export type Output = Result | NoResult;

export interface ResultClass <
    T extends Result,
> {
    new (
        ...args: any[]
    ): T;
}

export class Action extends Result {
     
    action: () => Observable<any>;

    constructor (
        action: () => any,
        score?: number,
    ) {
        super(score);
        
        if (action.length > 0)
            throw new Error("Actions must have zero arguments.");

        this.action = () => observableOf(action).pipe(
            map(action => action()),
            flatMap(toObservable),
        );
    }
}

export class Value <VALUE> extends Result {

    constructor (
        public value: VALUE,
        score?: number,
    ) {
        super(score);
    }
}

type NormalizedOutput <O> =
    O extends undefined | null | NoResult ? NoResult :
    O extends Result ? O :
    O extends () => any ? Action :
    Value<O>;

export type Norm <O> = NormalizedOutput<BaseType<O>>;

export type Transform <
    ARGS extends any[],
    OUTPUT extends Output,
> = (...args: ARGS) => Observable<OUTPUT>;

export function from <
    ARGS extends any[] = [],
    O = NoResult,
> (
    transform?: null | ((...args: ARGS) => O),
): Transform<ARGS, Norm<O>>

export function from (
    transform?: any,
) {
    if (!transform)
        return NoResult.transform;

    if (typeof transform !== 'function')
        throw new Error("I can't transform that.");

    return (...args: any[]) => observableOf(transform).pipe(
        map(transform => transform(...args)),
        flatMap(toObservable),
        map(o =>
            o == null || o === NoResult.singleton ? NoResult.singleton :
            o instanceof Result ? o :
            typeof o === 'function' ? new Action(o) :
            new Value(o)
        ),
    );
}
