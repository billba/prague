import { Result, Transform, Norm, from, toObservable, Action, ResultClass, Output, filterOutNull, nullIfEmpty, NullIfNullable, transformToNull } from "./prague";
import { from as observableFrom, of as observableOf, Observable} from "rxjs";
import { reduce, flatMap, map, mergeAll, mapTo } from "rxjs/operators";

export function pipe(): Transform<[], null>;

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
]): Transform<ARGS, NullIfNullable<Norm<R0>> | Norm<R1>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (arg: NonNullable<Norm<R0>>) => R1,
    (arg: NonNullable<Norm<R1>>) => R2
]): Transform<ARGS, NullIfNullable<Norm<R0 | R1>> | Norm<R2>>;

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
]): Transform<ARGS, NullIfNullable<Norm<R0 | R1 | R2>> | Norm<R3>>;

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
]): Transform<ARGS, NullIfNullable<Norm<R0 | R1 | R2 | R3>> | Norm<R4>>;

export function pipe <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => any,
    ...transforms: ((result: Result) => any)[]
): Transform<ARGS, Output>;

export function pipe (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    let _transform: Transform<any[], Output>,
        _transforms: Transform<[Result], Output>[];

    [_transform, ..._transforms] = transforms.map(_transform => from(_transform));
    const __transforms = observableFrom(_transforms);

    return ((...args: any[]) => __transforms.pipe(
        reduce<Transform<[Result], Output>, Observable<Result>>(
            (result$, _transform) => result$.pipe(
                flatMap(result => _transform(result)),
                filterOutNull,
            ),
            _transform(...args).pipe(
                filterOutNull,
            )
        ),
        mergeAll(),
        nullIfEmpty,
    )) as Transform<any[], any>;
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
) => from((o: Output) => o || transform());

export const run = tap(transformResult(Action, action => action.action()));

export function combine (): Transform<[], null>;

export function combine <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => R0
]): Transform<ARGS, Norm<R0>>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1
]): Transform<ARGS, Norm<R1>>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1,
    (arg: Norm<R1>) => R2
]): Transform<ARGS, Norm<R2>>;

export function combine <
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

export function combine <
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

export function combine <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => any,
    ...transforms: ((arg: Output) => any)[]
): Transform<ARGS, Output>;

export function combine (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    let _transform: Transform<any[], Output>,
        _transforms: Transform<[Output], Output>[];

    [_transform, ..._transforms] = transforms.map(_transform => from(_transform));
    const __transforms = observableFrom(_transforms);

    return ((...args: any[]) => __transforms.pipe(
        reduce<Transform<[Output], Output>, Observable<Output>>(
            (result$, _transform) => result$.pipe(
                flatMap(result => _transform(result)),
            ),
            _transform(...args)
        ),
        mergeAll(),
    )) as Transform<any[], any>;
}
