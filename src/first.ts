import { Result, Transform, Norm, from, filterOutNull } from "./prague";
import { from as observableFrom} from "rxjs";
import { concatMap, take, map } from "rxjs/operators";
import { transformToNull } from "./core";

export function first(): Transform<[], null>;

export function first <
    ARGS extends any[] = [],
    R0 = never,
> (...args: [
    null | undefined | ((...args: ARGS) => R0)
]): Transform<ARGS, Norm<R0>>;

export function first <
    ARGS extends any[] = [],
    R0 = never,
    R1 = never,
> (...args: [
    null | undefined | ((...args: ARGS) => R0),
    null | undefined | ((...args: ARGS) => R1)
]): Transform<ARGS, Norm<NonNullable<R0> | R1>>;

export function first <
    ARGS extends any[] = [],
    R0 = never,
    R1 = never,
    R2 = never,
> (...args: [
    null | undefined | ((...args: ARGS) => R0),
    null | undefined | ((...args: ARGS) => R1),
    null | undefined | ((...args: ARGS) => R2)
]): Transform<ARGS, Norm<NonNullable<R0 | R1> | R2>>;

export function first <
    ARGS extends any[] = [],
    R0 = never,
    R1 = never,
    R2 = never,
    R3 = never,
> (...args: [
    null | undefined | ((...args: ARGS) => R0),
    null | undefined | ((...args: ARGS) => R1),
    null | undefined | ((...args: ARGS) => R2),
    null | undefined | ((...args: ARGS) => R3)
]): Transform<ARGS, Norm<NonNullable<R0 | R1 | R2> | R3>>;

export function first <
    ARGS extends any[] = [],
    R0 = never,
    R1 = never,
    R2 = never,
    R3 = never,
    R4 = never,
> (...args: [
    null | undefined | ((...args: ARGS) => R0),
    null | undefined | ((...args: ARGS) => R1),
    null | undefined | ((...args: ARGS) => R2),
    null | undefined | ((...args: ARGS) => R3),
    null | undefined | ((...args: ARGS) => R4)
]): Transform<ARGS, Norm<NonNullable<R0 | R1 | R2 | R3> | R4>>;

export function first <
    ARGS extends any[] = [],
> (...args:
    (null | undefined | ((...args: ARGS) => any))[]
): Transform<ARGS, Result>;

export function first (
    ...transforms: (null | undefined | ((...args: any[]) => any))[]
) {
    if (transforms.length === 0)
        return transformToNull;

    const _transforms = observableFrom(transforms
        .filter(transform => !!transform)
        .map(transform => from(transform))
    );

    return from((...args: any[]) => _transforms.pipe(
        // we put concatMap here because it forces everything to after it to execute serially
        concatMap(transform => transform(...args)),
        filterOutNull,
        // Stop when one emits a result
        take(1), 
        filterOutNull,
    ));
}
