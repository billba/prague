import { Observable, from, of } from 'rxjs';
import { take, map, flatMap, concatMap, filter, reduce, tap, mergeAll, mapTo, refCount } from 'rxjs/operators';

export type BaseType <T> =
    T extends Observable<infer BASETYPE> ? BASETYPE :
    T extends Promise<infer BASETYPE> ? BASETYPE :
    T;

export type Observableable<T> = Observable<T> | Promise<T> | T;

export const toObservable = <T> (
    t: Observable<T> | Promise<T> | T,
) =>
    t instanceof Observable ? t.pipe(take(1)) :
    t instanceof Promise ? from(t) :
    of(t);

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

        this.action = () => of(action).pipe(
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

type Norm<R> = NormalizedResult<BaseType<R>>;

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

export type Xform <
    ARGS extends any[],
    RESULT extends Result | undefined,
> = (...args: ARGS) => Observable<RESULT>;

const none = () => of(undefined);

function _from <
    ARGS extends any[],
    R,
> (
    transform?: (...args: ARGS) => R,
): Xform<ARGS, Norm<R>> {

    if (!transform)
        return none as any;

    if (typeof transform !== 'function')
        throw new Error("I can't transform that.");

    return (...args: ARGS) => of(transform).pipe(
        map(transform => transform(...args)),
        flatMap(toObservable),
        map(result => normalizedResult(result) as Norm<R>),
    );
}

export { _from as from }

export function first <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => R0
]): Xform<ARGS, Norm<R0>>;

export function first <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1
]): Xform<ARGS, Norm<R0 | R1>>;

export function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2
]): Xform<ARGS, Norm<R0 | R1 | R2>>;

export function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2,
    (...args: ARGS) => R3
]): Xform<ARGS, Norm<R0 | R1 | R2 | R3>>;

export function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2,
    (...args: ARGS) => R3
]): Xform<ARGS, Norm<R0 | R1 | R2 | R3 | R4>>;

export function first <
    ARGS extends any[],
> (...args:
    ((...args: ARGS) => any)[]
): Xform<ARGS, Result | undefined>;

export function first (
    ...transforms: ((...args: any[]) => any)[]
) {
    const _transforms = from(transforms.map(transform => _from(transform)));

    return (...args: any[]) => _transforms.pipe(
        // we put concatMap here because it forces everything to after it to execute serially
        concatMap((transform, i) => transform(...args).pipe(
            // ignore every undefined but the last one
            filter(result => i === transforms.length - 1 || result !== undefined),
        )),
        // Stop when we find one that matches
        take(1), 
    );
}

export function pipe <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => R0
]): Xform<ARGS, Norm<R0>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1
]): Xform<ARGS, Norm<R1>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1,
    (arg: Norm<R1>) => R2
]): Xform<ARGS, Norm<R2>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1,
    (arg: Norm<R1>) => R2,
    (arg: Norm<R2>) => R3
]): Xform<ARGS, Norm<R3>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1,
    (arg: Norm<R1>) => R2,
    (arg: Norm<R2>) => R3,
    (arg: Norm<R2>) => R4
]): Xform<ARGS, Norm<R4>>;

export function pipe <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => Result | undefined,
    ...functions: ((... args: any[]) => Result)[]
): Xform<ARGS, Result | undefined>;

export function pipe (
    ...transforms: ((...args: any[]) => any)[]
) {
    const _transforms = from(transforms.map(transform => _from(transform)));

    return (...args: any[]) => _transforms.pipe(
        reduce<Xform<any[], Result | undefined>, Observable<any[]>>(
            (args$, transform) => args$.pipe(
                flatMap(args => transform(...args)),
                map(result => [result])
            ),
            of(args)
        ),
        mergeAll(),
        map(results => results[0]),
    );
}


export const _tap = <
    RESULT extends Result | undefined,
> (
    fn: (route: RESULT) => any,
): Xform<[RESULT], RESULT> =>
    (route: RESULT) => of(route).pipe(
        map(route => fn(route)),
        flatMap(toObservable),
        mapTo(route)
    );

export { _tap as tap }

export const run = _tap(result => {
    if (result instanceof Action)
        return result.action();
});

const getMatchError = new Error("matching function should only return MatchRoute or NoRoute");

export function match <
    ARGS extends any[],
    VALUE,
    ONMATCH,
    ONNOMATCH,
> (
    getMatch: (... args: ARGS) => Observableable<null | undefined | VALUE | Match<VALUE>>,
    onMatch: (match: Match<VALUE>) => ONMATCH,
    onNoMatch?: () => ONNOMATCH,
) {
    const _getMatch  = _from(getMatch);
    const _onMatch   = _from(onMatch);
    const _onNoMatch = _from(onNoMatch);

    return pipe(
        _getMatch,
        route => {
            if (!route)
                return _onNoMatch();

            if (route instanceof Match)
                return _onMatch(route);

            throw getMatchError;
        }
    );
}

const ifPredicateError = new Error("predicate must return true or false");

function _if <
    ARGS extends any[],
    ONMATCH,
    ONNOMATCH,
> (
    predicate: (... args: ARGS) => any,
    onMatch: () => ONMATCH,
    onNoMatch?: () => ONNOMATCH,
) {
    return match(
        pipe(
            (... args: ARGS) => of(args).pipe(
                map(args => predicate(...args)),
                flatMap(toObservable),
                map(result => result instanceof Match ? !!result.value : !!result),
            ),
            route => {
                if (route instanceof Match) {
                    if (route.value === true)
                        return true;
                    
                    if (route.value === false)
                        return undefined;
                }

                throw ifPredicateError;
            },
        ),
        onMatch,
        onNoMatch,
    );
}

export { _if as if }
