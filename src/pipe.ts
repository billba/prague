import { Result, Transform, Norm, from, toObservable, Action } from "./prague";
import { from as observableFrom, of as observableOf, Observable} from "rxjs";
import { reduce, flatMap, map, mergeAll, mapTo } from "rxjs/operators";

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
    ...transforms: ((result: any) => any)[]
): Transform<ARGS, Result>;

export function pipe (
    transform: (...args: any[]) => Result,
    ...transforms: ((result: Result) => Result)[]
) {
    const _transforms = observableFrom(transforms.map(_transform => from(_transform)));

    return (...args: any[]) => _transforms.pipe(
        reduce<Transform<[Result], Result>, Observable<Result>>(
            (result$, _transform) => result$.pipe(
                flatMap(result => _transform(result)),
            ),
            from(transform)(...args)
        ),
        mergeAll(),
    );
}

export const _tap = <
    RESULT extends Result,
> (
    fn: (result: RESULT) => any,
): Transform<[RESULT], RESULT> =>
    (result: RESULT) => observableOf(result).pipe(
        map(result => fn(result)),
        flatMap(toObservable),
        mapTo(result)
    );

export const log = _tap(console.log);

export { _tap as tap }

export const run = _tap(result => {
    if (result instanceof Action)
        return result.action();
});


