import { Result, Transform, Norm, from, toObservable, Action, ResultClass, Output, filterOutNull, nullIfEmpty, Nullable } from "./prague";
import { from as observableFrom, of as observableOf, Observable} from "rxjs";
import { reduce, flatMap, map, mergeAll, mapTo, defaultIfEmpty } from "rxjs/operators";

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
    (arg: NonNullable<Norm<R0>>) => R1
]): Transform<ARGS, Nullable<Norm<R0>> | Norm<R1>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (arg: NonNullable<Norm<R0>>) => R1,
    (arg: NonNullable<Norm<R1>>) => R2
]): Transform<ARGS, Nullable<Norm<R0 | R1>> | Norm<R2>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => R0,
    (arg: NonNullable<Norm<R0>>) => R1,
    (arg: NonNullable<Norm<R1>>) => R2,
    (arg: NonNullable<Norm<R2>>) => R3
]): Transform<ARGS, Nullable<Norm<R0 | R1 | R2>> | Norm<R3>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => R0,
    (arg: NonNullable<Norm<R0>>) => R1,
    (arg: NonNullable<Norm<R1>>) => R2,
    (arg: NonNullable<Norm<R2>>) => R3,
    (arg: NonNullable<Norm<R2>>) => R4
]): Transform<ARGS, Nullable<Norm<R0 | R1 | R2 | R3>> | Norm<R4>>;

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
    return from((...args: any[]) => observableFrom(transforms.map(_transform => from(_transform))).pipe(
        reduce<Transform<[Result], Output>, Observable<Result>>(
            (result$, _transform) => result$.pipe(
                flatMap(result => _transform(result)),
                filterOutNull,
            ),
            from(transform)(...args).pipe(
                filterOutNull,
            )
        ),
        mergeAll(),
        nullIfEmpty,
    ));
}

export const tap = <
    RESULT extends Result,
> (
    fn: (result: RESULT) => any,
): Transform<[RESULT], RESULT> =>
    (result: RESULT) => observableOf(result).pipe(
        map(result => fn(result)),
        flatMap(toObservable),
        nullIfEmpty,
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

export const transformNull = <
    R,
> (
    transform: () => R,
) => from((o: Output) => o === null ? transform() : o);

export const run = tap(transformResult(Action, action => action.action()));
