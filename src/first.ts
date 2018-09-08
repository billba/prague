import { Transform, Returns, from, filterOutNull, nullIfEmpty, transformToNull } from "./prague";
import { from as observableFrom} from "rxjs";
import { concatMap, take } from "rxjs/operators";

export function first(): Transform<[], null>;

export function first <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => Returns<R0>
]): Transform<ARGS, R0>;

export function first <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>
]): Transform<ARGS, NonNullable<R0> | R1>;

export function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>,
    (...args: ARGS) => Returns<R2>
]): Transform<ARGS, NonNullable<R0 | R1> | R2>;

export function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>,
    (...args: ARGS) => Returns<R2>,
    (...args: ARGS) => Returns<R3>
]): Transform<ARGS, NonNullable<R0 | R1 | R2> | R3>;

export function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>,
    (...args: ARGS) => Returns<R2>,
    (...args: ARGS) => Returns<R3>,
    (...args: ARGS) => Returns<R4>
]): Transform<ARGS, NonNullable<R0 | R1 | R2 | R3> | R4>;

export function first <
    ARGS extends any[],
> (...args:
    ((...args: ARGS) => any)[]
): Transform<ARGS, any>;

export function first (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    const _transforms = observableFrom(transforms.map(transform => from(transform)));

    return ((...args: any[]) => _transforms.pipe(
        // we put concatMap here because it forces everything to after it to execute serially
        concatMap(transform => transform(...args)),
        filterOutNull,
        // stop when one emits a result
        take(1),
        // if none of the transforms emitted a Result, emit null
        nullIfEmpty,
    )) as Transform<any[], any>;
}
