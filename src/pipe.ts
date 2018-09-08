import { Transform, BaseType, from, toObservable, filterOutNull, nullIfEmpty, NullIfNullable, transformToNull } from "./prague";
import { from as observableFrom, of as observableOf, Observable} from "rxjs";
import { reduce, flatMap, map, mergeAll, mapTo } from "rxjs/operators";

export function pipe(): Transform<[], null>;

export function pipe <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => R0
]): Transform<ARGS, BaseType<R0>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => R0,
    (arg: NonNullable<BaseType<R0>>) => R1
]): Transform<ARGS, NullIfNullable<BaseType<R0>> | BaseType<R1>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (arg: NonNullable<BaseType<R0>>) => R1,
    (arg: NonNullable<BaseType<R1>>) => R2
]): Transform<ARGS, NullIfNullable<BaseType<R0 | R1>> | BaseType<R2>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => R0,
    (arg: NonNullable<BaseType<R0>>) => R1,
    (arg: NonNullable<BaseType<R1>>) => R2,
    (arg: NonNullable<BaseType<R2>>) => R3
]): Transform<ARGS, NullIfNullable<BaseType<R0 | R1 | R2>> | BaseType<R3>>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => R0,
    (arg: NonNullable<BaseType<R0>>) => R1,
    (arg: NonNullable<BaseType<R1>>) => R2,
    (arg: NonNullable<BaseType<R2>>) => R3,
    (arg: NonNullable<BaseType<R2>>) => R4
]): Transform<ARGS, NullIfNullable<BaseType<R0 | R1 | R2 | R3>> | BaseType<R4>>;

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
    (...args: ARGS) => R0
]): Transform<ARGS, BaseType<R0>>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => R0,
    (arg: BaseType<R0>) => R1
]): Transform<ARGS, BaseType<R1>>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (arg: BaseType<R0>) => R1,
    (arg: BaseType<R1>) => R2
]): Transform<ARGS, BaseType<R2>>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => R0,
    (arg: BaseType<R0>) => R1,
    (arg: BaseType<R1>) => R2,
    (arg: BaseType<R2>) => R3
]): Transform<ARGS, BaseType<R3>>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => R0,
    (arg: BaseType<R0>) => R1,
    (arg: BaseType<R1>) => R2,
    (arg: BaseType<R2>) => R3,
    (arg: BaseType<R2>) => R4
]): Transform<ARGS, BaseType<R4>>;

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
