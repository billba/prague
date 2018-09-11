import { Transform, Returns, transformToNull, from } from "./prague";

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
