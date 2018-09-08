import { Transform, Returns, from, toObservable, filterOutNull, nullIfEmpty, NullIfNullable, transformToNull } from "./prague";
import { from as observableFrom, of as observableOf, Observable} from "rxjs";
import { reduce, flatMap, map, mergeAll, mapTo } from "rxjs/operators";

export function pipe(): Transform<[], null>;

export function pipe <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => Returns<R0>
]): Transform<ARGS, R0>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>
]): Transform<ARGS, NullIfNullable<R0> | R1>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>,
    (arg: NonNullable<R1>) => Returns<R2>
]): Transform<ARGS, NullIfNullable<R0 | R1> | R2>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>,
    (arg: NonNullable<R1>) => Returns<R2>,
    (arg: NonNullable<R2>) => Returns<R3>
]): Transform<ARGS, NullIfNullable<R0 | R1 | R2> | R3>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>,
    (arg: NonNullable<R1>) => Returns<R2>,
    (arg: NonNullable<R2>) => Returns<R3>,
    (arg: NonNullable<R3>) => Returns<R4>
]): Transform<ARGS, NullIfNullable<R0 | R1 | R2 | R3> | R4>;

export function pipe <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => any,
    ...transforms: ((result: any) => any)[]
): Transform<ARGS, any>;

export function pipe (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    let [_transform, ..._transforms] = transforms.map(_transform => from(_transform));
    const __transforms = observableFrom(_transforms);

    return ((...args: any[]) => __transforms.pipe(
        reduce<Transform<[any], any>, Observable<any>>(
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
    RESULT,
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

type Ctor<T> = {
    new(...args: any[]): T
}

export const transformInstance = <
    T,
    R,
> (
    Target: Ctor<T>,
    transform: (r: T) => R,
) => from((r: any) => r instanceof Target ? transform(r as T) : r);

export const transformNull = <
    R,
> (
    transform: () => R,
) => from((o: any) => o || transform());

export const doAction = tap(o => {
    if (typeof o === 'function')
        return observableOf(o).pipe(
            map(action => action()),
            flatMap(toObservable),
        );
});

export function run <
    ARGS extends any[],
    O
> (
    transform: (...args: ARGS) => O
) {
    return pipe(
        transform,
        doAction,
    );
}

export function combine (): Transform<[], null>;

export function combine <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => Returns<R0>
]): Transform<ARGS, R0>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>
]): Transform<ARGS, R1>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>,
    (arg: R1) => Returns<R2>
]): Transform<ARGS, R2>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>,
    (arg: R1) => Returns<R2>,
    (arg: R2) => Returns<R3>
]): Transform<ARGS, R3>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>,
    (arg: R1) => Returns<R2>,
    (arg: R2) => Returns<R3>,
    (arg: R3) => Returns<R4>
]): Transform<ARGS, R4>;

export function combine <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => any,
    ...transforms: ((arg: any) => any)[]
): Transform<ARGS, any>;

export function combine (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    let [_transform, ..._transforms] = transforms.map(_transform => from(_transform));
    const __transforms = observableFrom(_transforms);

    return ((...args: any[]) => __transforms.pipe(
        reduce<Transform<[any], any>, Observable<any>>(
            (result$, _transform) => result$.pipe(
                flatMap(result => _transform(result)),
            ),
            _transform(...args)
        ),
        mergeAll(),
    )) as Transform<any[], any>;
}
