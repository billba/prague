import { Transform, Returns, from, toPromise, NullIfNullable, transformToNull } from "./prague";

/**
 * Compose multiple functions into a new Transform by chaining the result of one as the argument to the next, stopping if one returns null
 * @param ARGS The arguments to the first function, and to the resultant Transform
 * @param args The functions to chain together
 * @returns A new Transform which returns null if any function returns null, otherwise the result of the last function
 */
export function pipe(): Transform<[], null>;

export function pipe <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => Returns<R0>
]): Transform<ARGS, R0>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>
]): Transform<ARGS, NullIfNullable<R0> | R1>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>,
    (arg: NonNullable<R1>) => Returns<R2>
]): Transform<ARGS, NullIfNullable<R0 | R1> | R2>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>,
    (arg: NonNullable<R1>) => Returns<R2>,
    (arg: NonNullable<R2>) => Returns<R3>
]): Transform<ARGS, NullIfNullable<R0 | R1 | R2> | R3>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>,
    (arg: NonNullable<R1>) => Returns<R2>,
    (arg: NonNullable<R2>) => Returns<R3>,
    (arg: NonNullable<R3>) => Returns<R4>
]): Transform<ARGS, NullIfNullable<R0 | R1 | R2 | R3> | R4>;

export function pipe <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => any,
    ...transforms: ((result: any) => any)[]
): Transform<ARGS, any>;

export function pipe (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    const _transforms = transforms.map(from);

    return (async (...args: any[]) => {
        let o = null;

        for (const transform of _transforms) {
            o = await transform(...args);
            if (o === null)
                return null;
            
            args = [o];
        }

        return o;
    }) as Transform<any[], any>;
}

/**
 * Wraps the supplied function in a new Transform which runs the function with its argument and then returns that argument. Good for executing code without disrupting a pipe or combine chain.
 * @param fn The function to execute
 * @returns A new Transform which returns its argument
 */
export const tap = <
    R,
> (
    fn: (result: R) => any,
): Transform<[R], R> =>
    (result: R) => toPromise(fn(result))
        .then(() => result);

/**
 * A Transform which runs console.log on it's argument and then returns it
 * @returns A Transform which returns its argument
 */
export const log = tap(console.log);

/**
 * A Transform which runs its argument if it's a function
 * @returns A Transform which returns its argument
 */
export const doAction = tap(o => {
    if (typeof o === 'function')
        return o();
});

/**
 * Wraps a function in a new Transform which runs the function and runs its result if it's a function
 * @param transform the function whose result may be a function to run
 * @returns A new Transform
 */
export function run <
    ARGS extends any[],
    O
> (
    transform: (...args: ARGS) => O
) {
    return pipe(
        transform,
        doAction,
    );
}

/**
 * Compose multiple functions into a new Transform by chaining the result of one as the argument to the next
 * @param ARGS The arguments to the first function, and to the resultant Transform
 * @param args The transforms to chain together
 * @returns A new Transform which returns the result of the last function
 */
export function combine (): Transform<[], null>;

export function combine <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => Returns<R0>
]): Transform<ARGS, R0>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>
]): Transform<ARGS, R1>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>,
    (arg: R1) => Returns<R2>
]): Transform<ARGS, R2>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>,
    (arg: R1) => Returns<R2>,
    (arg: R2) => Returns<R3>
]): Transform<ARGS, R3>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>,
    (arg: R1) => Returns<R2>,
    (arg: R2) => Returns<R3>,
    (arg: R3) => Returns<R4>
]): Transform<ARGS, R4>;

export function combine <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => any,
    ...transforms: ((arg: any) => any)[]
): Transform<ARGS, any>;

export function combine (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    const _transforms = transforms.map(from);

    return (async (...args: any[]) => {
        for (const transform of _transforms) {
            args = [await transform(...args)];
        }

        return args[0];
    }) as Transform<any[], any>;
}
