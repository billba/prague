import { Observable, from as observableFrom, of as observableOf, empty} from 'rxjs';
import { take, map, flatMap } from 'rxjs/operators';

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

export class NoResult extends Result {
    private constructor() {
        super();
    }

    static singleton = new NoResult();

    static transform = () => observableOf(NoResult.singleton);

    static filterOut = (result: Result) => result !== NoResult.singleton;
}

export interface ResultClass <
    T extends Result
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
            flatMap(toObservable)
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

type NormalizedResult <R> =
    R extends undefined | null ? NoResult :
    R extends Result ? R :
    R extends () => any ? Action :
    Value<R>;

export type Norm <R> = NormalizedResult<BaseType<R>>;

export type Transform <
    ARGS extends any[],
    RESULT extends Result,
> = (...args: ARGS) => Observable<RESULT>;

export function from <
    ARGS extends any[] = [],
    R = never,
> (
    transform?: null | ((...args: ARGS) => R),
): Transform<ARGS, Norm<R>>

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
        map(result =>
            result == null ? NoResult.singleton :
            result instanceof Result ? result :
            typeof result === 'function' ? new Action(result) :
            new Value(result)
        ),
    );
}
