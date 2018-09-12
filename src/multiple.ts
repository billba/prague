import { Transform, Returns, transformToNull, from } from "./prague";
const flat = require('array.prototype.flat');

type MaybeArray<T> = [T] extends [never] ? never : T | Array<T>;

type NullIfNull<T> = NonNullable<T> extends never ? null : never;

type F<T> = NonNullable<T> extends never ? never : T;

type Flatten<T> = T extends Array<infer U> ? U : T;

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
]): Transform<ARGS, R0>;

export function multiple <
    ARGS extends any[],
    R0,
    R1,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>
]): Transform<ARGS, MaybeArray<NonNullable<Flatten<R0> | Flatten<R1>>> | NullIfNull<F<R0> | F<R1>>>;

export function multiple <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...transforms: [
    (...args: ARGS) => Returns<R0>,
    (...args: ARGS) => Returns<R1>,
    (...args: ARGS) => Returns<R2>
]): Transform<ARGS, MaybeArray<NonNullable<Flatten<R0> | Flatten<R1> | Flatten<R2>>> | NullIfNull<F<R0> | F<R1> | F<R2>>>;

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
]): Transform<ARGS, MaybeArray<NonNullable<Flatten<R0> | Flatten<R1> | Flatten<R2> | Flatten<R3>>> | NullIfNull<F<R0> | F<R1> | F<R2> | F<R3>>>;

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
]): Transform<ARGS, MaybeArray<NonNullable<Flatten<R0> | Flatten<R1> | Flatten<R2> | Flatten<R3> | Flatten<R4>>> | NullIfNull<F<R0> | F<R1> | F<R3> | F<R4>>>;

export function multiple <
    ARGS extends any[],
    O
> (...args:
    ((...args: ARGS) => Returns<O>)[]
): Transform<ARGS, NonNullable<O> | NullIfNull<O>>;

export function multiple <
    ARGS extends any[],
> (...args:
    ((...args: ARGS) => any)[]
): Transform<ARGS, any>;

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
