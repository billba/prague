import { Returns, transformToNull, from, Norm } from "./prague";

type First<Prev, Last> = Prev extends null | undefined ? Norm<Last> : Prev;

/**
 * Compose multiple functions into a single transform which tries each function in sequence until one succeeds  
 * @param ARGS The arguments to each transform argument, and to the resultant transform
 * @param transforms The transforms to try in order
 * @returns A new transform which returns the first non-null result of a transform, otherwise null
 */

export function first(
): () => Promise<null>;

export function first <
    ARGS extends any[],
    R0,
> (...transforms: [
    (...args: ARGS) => Returns<R0>
]): (...args: ARGS) => Promise<Norm<R0>>;

export function first <
    ARGS extends any[],
    R0,
    R1,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>
]): (...args: ARGS) => Promise<First<R0, R1>>;

export function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>,
    (...args: ARGS) => Returns<R2>
]): (...args: ARGS) => Promise<First<First<R0, R1>, R2>>

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
]): (...args: ARGS) => Promise<First<First<First<R0, R1>, R2>, R3>>;

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
]): (...args: ARGS) => Promise<First<First<First<First<R0, R1>, R2>, R3>, R4>>;

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
    (...args: ARGS) => Returns<R4>,
    ...((arg: any) => any)[]
]): (...args: ARGS) => Promise<First<First<First<First<First<R0, R1>, R2>, R3>, R4>, any>>;

export function first (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    const _transforms = transforms.map(from);

    return async (...args: any[]) => {
        for (const transform of _transforms) {
            const o = await transform(...args);
            if (o !== null)
                return o;
        }

        return null;
    };
}
