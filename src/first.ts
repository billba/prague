import { Result, Transform, Norm, from, filterOutNull } from "./prague";
import { from as observableFrom} from "rxjs";
import { concatMap, take } from "rxjs/operators";
import { nullIfEmpty } from "./core";

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
]): Transform<ARGS, NonNullable<Norm<R0>> | Norm<R1>>;

export function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2
]): Transform<ARGS, NonNullable<Norm<R0 | R1>> | Norm<R2>>;

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
]): Transform<ARGS, NonNullable<Norm<R0 | R1 | R2>> | Norm<R3>>;

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
]): Transform<ARGS, NonNullable<Norm<R0 | R1 | R2 | R3>> | Norm<R4>>;

export function first <
    ARGS extends any[],
> (...args:
    ((...args: ARGS) => any)[]
): Transform<ARGS, Result>;

export function first (
    ...transforms: ((...args: any[]) => any)[]
) {
    const _transforms = observableFrom(transforms.map(transform => from(transform)));

    return from((...args: any[]) => _transforms.pipe(
        // we put concatMap here because it forces everything to after it to execute serially
        concatMap(transform => transform(...args)),
        filterOutNull,
        // stop when one emits a result
        take(1),
        // if none of the transforms emitted a Result, emit null
        nullIfEmpty,
    ));
}
