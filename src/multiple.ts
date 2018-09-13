import { Transform, Returns, transformToNull, from, Norm } from "./prague";
const flat = require('array.prototype.flat');

type Flatten<T> = T extends Array<infer U> ? U : T;

type Multiple<Prev, Last> =
    Prev extends null | undefined ? Norm<Last> :
    // Prev is not null
    Last extends null | undefined ? Prev :
    // Last is not null
    Array<Flatten<Prev> | Flatten<Last>>;

/**
 * Composes multiple functions into a new Transform which collects the non-null results of the functions
 * @param ARGS the type of the arguments to the functions and the resultant Transform
 * @param transforms the functions to run
 * @returns a new Transform which returns the non-null results of the functions as an array or results, a single result, or null, as appropriate.
 */

export function multiple(): Transform<[], null>;

export function multiple <
    ARGS extends any[],
    R0,
> (...transforms: [
    (...args: ARGS) => Returns<R0>
]): Transform<ARGS, Norm<R0>>;

export function multiple <
    ARGS extends any[],
    R0,
    R1,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>
]): Transform<ARGS, Multiple<R0, R1>>;

export function multiple <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>,
    (...args: ARGS) => Returns<R2>
]): Transform<ARGS, Multiple<Multiple<R0, R1>, R2>>;

export function multiple <
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
]): Transform<ARGS, Multiple<Multiple<Multiple<R0, R1>, R2>, R3>>;

export function multiple <
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
]): Transform<ARGS, Multiple<Multiple<Multiple<Multiple<R0, R1>, R2>, R3>, R4>>;

export function multiple <
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
]): Transform<ARGS, Multiple<Multiple<Multiple<Multiple<Multiple<R0, R1>, R2>, R3>, R4>, any>>;

export function multiple (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;
    
    const _transforms = transforms.map(from);

    return async (...args: any[]) => { 
        const results = flat(
            (await Promise.all(_transforms.map(transform => transform(...args))))
                .filter(o => o !== null)
        ) as any[];

        return results.length === 0 ? null :
            results.length === 1 ? results[0] :
            results;
    };
}
