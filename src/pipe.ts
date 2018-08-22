import { Result, Transform, Norm, from, toObservable, Action, ResultClass, NoResult, Output } from "./prague";
import { from as observableFrom, of as observableOf, Observable} from "rxjs";
import { reduce, flatMap, map, mergeAll, mapTo, defaultIfEmpty, filter } from "rxjs/operators";

export function pipe <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => R0
]): Transform<ARGS, Norm<R0>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1
]): Transform<ARGS, Norm<R1>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1,
    (arg: Norm<R1>) => R2
]): Transform<ARGS, Norm<R2>>;

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
]): Transform<ARGS, Norm<R3>>;

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
]): Transform<ARGS, Norm<R4>>;

export function pipe <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => any,
    ...transforms: ((result: Result) => any)[]
): Transform<ARGS, Output>;

export function pipe (
    transform: (...args: any[]) => any,
    ...transforms: ((result: Result) => any)[]
) {
    const _transforms = observableFrom(transforms.map(_transform => from(_transform)));

    return (...args: any[]) => _transforms.pipe(
        reduce<Transform<[Result], Output>, Observable<Result>>(
            (result$, _transform) => result$.pipe(
                flatMap(result => _transform(result)),
                NoResult.filterOut,
            ),
            from(transform)(...args).pipe(
                NoResult.filterOut,
            )
        ),
        mergeAll(),
        defaultIfEmpty(NoResult.singleton),
    );
}

export const tap = <
    RESULT extends Result,
> (
    fn: (result: RESULT) => any,
): Transform<[RESULT], RESULT> =>
    (result: RESULT) => observableOf(result).pipe(
        map(result => fn(result)),
        flatMap(toObservable),
        defaultIfEmpty(result),
        mapTo(result),
    );

export const log = tap(console.log);

export const transformResult = <
    T extends Result,
    R,
> (
    TargetResult: ResultClass<T>,
    transform: (r: T) => R,
) => from((r: Result) => r instanceof TargetResult ? transform(r as T) : r);

export const transformNoResult = <
    T extends Output,
    R,
> (
    transform: () => R,
) => from((o: Output) => o === NoResult.singleton ? transform() : o);

export const run = tap(transformResult(Action, action => action.action()));
