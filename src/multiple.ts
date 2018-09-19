import { Returns, Flatten, toPromise } from "./prague";
const flat = require('array.prototype.flat');

export type Flatten<T> = T extends Array<infer U> ? U : T;

export type ToArray<Prev, Last> =
    Last extends null | undefined ? Prev :
    Prev extends [] ? Array<Flatten<Last>> :
    Prev extends Array<infer P> ? Array<P | Flatten<Last>> :
    never;

/**
 * Composes multiple functions into a new transform which collects the non-null results of the functions
 * @param ARGS the type of the arguments to the functions and the resultant transform
 * @param transforms the functions to run
 * @returns a new transform which returns the non-null results of the functions as an array or results, a single result, or null, as appropriate.
 */

export function toArray (
): () => Promise<[]>;

export function toArray <
    ARGS extends any[],
    R0,
> (...transforms: [
    (...args: ARGS) => Returns<R0>
]): (...args: ARGS) => Promise<ToArray<[], R0>>;

export function toArray <
    ARGS extends any[],
    R0,
    R1,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>
]): (...args: ARGS) => Promise<ToArray<ToArray<[], R0>, R1>>;

export function toArray <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>,
    (...args: ARGS) => Returns<R2>
]): (...args: ARGS) => Promise<ToArray<ToArray<ToArray<[], R0>, R1>, R2>>;

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
]): (...args: ARGS) => Promise<ToArray<ToArray<ToArray<ToArray<[], R0>, R1>, R2>, R3>>;

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
]): (...args: ARGS) => Promise<ToArray<ToArray<ToArray<ToArray<ToArray<[], R0>, R1>, R2>, R3>, R4>>;

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
]): (...args: ARGS) => Promise<ToArray<ToArray<ToArray<ToArray<ToArray<ToArray<[], R0>, R1>, R2>, R3>, R4>, any>>;

export function toArray <
    ARGS extends any[],
    R0,
> (...transforms:
    ((...args: ARGS) => Returns<R0>)[]
): (...args: ARGS) => Promise<ToArray<[], R0>>;

export function toArray (
    ...transforms: ((...args: any[]) => any)[]
) {
    return async (...args: any[]) => flat(
        (await Promise.all(transforms.map(transform => toPromise(transform(...args)))))
            .filter(o => o != null)
    ) as any[];
}

/**
 * A transform for retrieving the first element of an array
 * @returns a new transform which returns the contents of the first element of its argument if a non-empty array. If empty, returns null. If not an array, returns the argument.
 */

export type FromArray<T> = T extends [] ? null : T extends Array<infer U> ? U : T;

export function fromArray <R> (
    r: R,
) {
    return Promise.resolve(Array.isArray(r) ? r.length === 0 ? null : r[0] : r) as Promise<FromArray<R>>;
}
