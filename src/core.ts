import { Observable, from as observableFrom, of as observableOf} from 'rxjs';
import { take, map, flatMap, mapTo } from 'rxjs/operators';

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
        this.score = score === undefined || score > 1 ? 1 : score;
    }
}

export class Action extends Result {
     
    action: () => Observable<any>;

    constructor (
        action: () => any,
    ) {
        super();
        
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
    R extends undefined | null ? undefined :
    R extends Result ? R :
    R extends () => any ? Action :
    Match<R>;

export type Norm<R> = NormalizedResult<BaseType<R>>;

const normalizedResult = (
    result: any,
) => {
    if (result instanceof Result)
        return result;

    if (result == null)
        return undefined;

    if (typeof result === 'function')
        return new Action(result);

    return new Match(result);
};

export type Transform <
    ARGS extends any[],
    RESULT extends Result | undefined,
> = (...args: ARGS) => Observable<RESULT>;

const none = () => observableOf(undefined);

export function from <
    ARGS extends any[],
    R,
> (
    transform?: (...args: ARGS) => R,
): Transform<ARGS, Norm<R>> {

    if (!transform)
        return none as any;

    if (typeof transform !== 'function')
        throw new Error("I can't transform that.");

    return (...args: ARGS) => observableOf(transform).pipe(
        map(transform => transform(...args)),
        flatMap(toObservable),
        map(result => normalizedResult(result) as Norm<R>),
    );
}

export const _tap = <
    RESULT extends Result | undefined,
> (
    fn: (route: RESULT) => any,
): Transform<[RESULT], RESULT> =>
    (route: RESULT) => observableOf(route).pipe(
        map(route => fn(route)),
        flatMap(toObservable),
        mapTo(route)
    );

export { _tap as tap }

export const run = _tap(result => {
    if (result instanceof Action)
        return result.action();
});


