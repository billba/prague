import { Transform, Returns, from } from "./prague";
const flat = require('array.prototype.flat');

type Flatten<T> = T extends Array<infer U> ? U : T;

type ToArray<Prev, Last> =
    Last extends null | undefined ? Prev :
    Prev extends Array<infer P> ? Array<P | Flatten<Last>> :
    never;

/**
 * Composes multiple functions into a new Transform which collects the non-null results of the functions
 * @param ARGS the type of the arguments to the functions and the resultant Transform
 * @param transforms the functions to run
 * @returns a new Transform which returns the non-null results of the functions as an array or results, a single result, or null, as appropriate.
 */

export function toArray (
): Transform<[], []>;

export function toArray <
    ARGS extends any[],
    R0,
> (...transforms:
    ((...args: ARGS) => Returns<R0>)[]
): Transform<ARGS, ToArray<[], R0>>;

export function toArray <
    ARGS extends any[],
    R0,
    R1,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>
]): Transform<ARGS, ToArray<ToArray<[], R0>, R1>>;

export function toArray <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>,
    (...args: ARGS) => Returns<R2>
]): Transform<ARGS, ToArray<ToArray<ToArray<[], R0>, R1>, R2>>;

export function toArray <
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
]): Transform<ARGS, ToArray<ToArray<ToArray<ToArray<[], R0>, R1>, R2>, R3>>;

export function toArray <
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
]): Transform<ARGS, ToArray<ToArray<ToArray<ToArray<ToArray<[], R0>, R1>, R2>, R3>, R4>>;

export function toArray <
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
]): Transform<ARGS, ToArray<ToArray<ToArray<ToArray<ToArray<ToArray<[], R0>, R1>, R2>, R3>, R4>, any>>;

export function toArray (
    ...transforms: ((...args: any[]) => any)[]
) {
    const _transforms = transforms.map(from);

    return async (...args: any[]) => flat(
        (await Promise.all(_transforms.map(transform => transform(...args))))
            .filter(o => o !== null)
    ) as any[];
}

/**
 * A Transform for retrieving the first element of an array
 * @returns a new Transform which returns the contents of the first element of its argument if a non-empty array. If empty, returns null. If not an array, returns the argument.
 */

type FromArray<T> = T extends [] ? null : T extends Array<infer U> ? U : T;

export function fromArray <R> (
    r: R,
) {
    return Promise.resolve(Array.isArray(r) ? r.length === 0 ? null : r[0] : r) as Promise<FromArray<R>>;
}
