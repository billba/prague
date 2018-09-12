import { Transform, Returns, transformToNull, from } from "./prague";

/**
 * Compose multiple functions into a single Transform which tries each function in sequence until one succeeds  
 * @param ARGS The arguments to each Transform argument, and to the resultant Transform
 * @param transforms The transforms to try in order
 * @returns A new Transform which returns the first non-null result of a transform, otherwise null
 */
export function first(): Transform<[], null>;

export function first <
    ARGS extends any[],
    R0,
> (...transforms: [
    (...args: ARGS) => Returns<R0>
]): Transform<ARGS, R0>;

export function first <
    ARGS extends any[],
    R0,
    R1,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>
]): Transform<ARGS, NonNullable<R0> | R1>;

export function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...transforms: [
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
> (...transforms: [
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
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>,
    (...args: ARGS) => Returns<R2>,
    (...args: ARGS) => Returns<R3>,
    (...args: ARGS) => Returns<R4>
]): Transform<ARGS, NonNullable<R0 | R1 | R2 | R3> | R4>;

export function first <
    ARGS extends any[],
> (...transforms:
    ((...args: ARGS) => any)[]
): Transform<ARGS, any>;

export function first (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    const _transforms = transforms.map(from);

    return (async (...args: any[]) => {
        for (const transform of _transforms) {
            const o = await transform(...args);
            if (o !== null)
                return o;
        }

        return null;
    });
}
