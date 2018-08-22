import { Result, Transform, Norm, from, filterOutNull } from "./prague";
import { from as observableFrom} from "rxjs";
import { concatMap, take } from "rxjs/operators";

export function first(): Transform<[], never>;

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
]): Transform<ARGS, Norm<R0 | R1>>;

export function first <
    ARGS extends any[] = [],
    R0 = never,
    R1 = never,
    R2 = never,
> (...args: [
    null | undefined | ((...args: ARGS) => R0),
    null | undefined | ((...args: ARGS) => R1),
    null | undefined | ((...args: ARGS) => R2)
]): Transform<ARGS, Norm<R0 | R1 | R2>>;

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
]): Transform<ARGS, Norm<R0 | R1 | R2 | R3>>;

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
]): Transform<ARGS, Norm<R0 | R1 | R2 | R3 | R4>>;

export function first <
    ARGS extends any[] = [],
> (...args:
    (null | undefined | ((...args: ARGS) => any))[]
): Transform<ARGS, Result>;

export function first (
    ...transforms: (null | undefined | ((...args: any[]) => any))[]
) {
    return from((...args: any[]) => observableFrom(transforms.map(transform => from(transform))).pipe(
        // we put concatMap here because it forces everything to after it to execute serially
        concatMap(transform => transform(...args)),
        filterOutNull,
        // Stop when one emits a result
        take(1), 
        filterOutNull,
    ));
}
