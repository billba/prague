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

export class Match <VALUE> extends Result {

    constructor (
        public value: VALUE,
        score?: number,
    ) {
        super(score);
    }
}

type NormalizedResult<R> =
    R extends undefined | null ? never :
    R extends Result ? R :
    R extends () => any ? Action :
    Match<R>;

export type Norm<R> = NormalizedResult<BaseType<R>>;

export type Transform <
    ARGS extends any[],
    RESULT extends Result,
> = (...args: ARGS) => Observable<RESULT>;

const none = () => empty();

export function from <
    ARGS extends any[],
    R,
> (
    transform?: null | ((...args: ARGS) => R),
): Transform<ARGS, Norm<R>>

export function from (
    transform?: any,
) {
    if (!transform)
        return none;

    if (typeof transform !== 'function')
        throw new Error("I can't transform that.");

    return (...args: any[]) => observableOf(transform).pipe(
        map(transform => transform(...args)),
        flatMap(toObservable),
        flatMap(result => result == null ? empty() : observableOf(
            result instanceof Result ? result :
            typeof result === 'function' ? new Action(result) :
            new Match(result)
        )),
    );
}
