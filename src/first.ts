import { Result, Transform, Norm, from } from "./prague";
import { from as observableFrom} from "rxjs";
import { concatMap, take, filter } from "rxjs/operators";

export function first <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => R0
]): Transform<ARGS, Norm<R0>>;

export function first <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1
]): Transform<ARGS, Norm<R0 | R1>>;

export function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2
]): Transform<ARGS, Norm<R0 | R1 | R2>>;

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
]): Transform<ARGS, Norm<R0 | R1 | R2 | R3>>;

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
    (...args: ARGS) => R3,
    (...args: ARGS) => R4
]): Transform<ARGS, Norm<R0 | R1 | R2 | R3 | R4>>;


export function first <
    ARGS extends any[],
> (...args:
    ((...args: ARGS) => any)[]
): Transform<ARGS, Result | undefined>;

export function first (
    ...transforms: ((...args: any[]) => any)[]
) {
    const _transforms = observableFrom(transforms.map(transform => from(transform)));

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
