import { Result, Transform, Norm, from } from "./prague";
import { from as observableFrom, of as observableOf, Observable} from "rxjs";
import { reduce, flatMap, map, mergeAll } from "rxjs/operators";

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
    transform: (...args: ARGS) => Result | undefined,
    ...functions: ((... args: any[]) => Result)[]
): Transform<ARGS, Result | undefined>;

export function pipe (
    ...transforms: ((...args: any[]) => any)[]
) {
    const _transforms = observableFrom(transforms.map(transform => from(transform)));

    return (...args: any[]) => _transforms.pipe(
        reduce<Transform<any[], Result | undefined>, Observable<any[]>>(
            (args$, transform) => args$.pipe(
                flatMap(args => transform(...args)),
                map(result => [result])
            ),
            observableOf(args)
        ),
        mergeAll(),
        map(results => results[0]),
    );
}
