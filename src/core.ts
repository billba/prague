/**
 * A type of a value or a Promise thereof 
 * @param T The type of the value
 */

export type Returns<T> = Promise<T> | T;

/**
 * Normalizes the supplied value into a Promise
 * @param t The value to normalize. If it's already a Promise, returns it. Otherwise turns it into a Promise.
 */

export const toPromise = <T> (
    t: Returns<T>,
) => t instanceof Promise ? t : Promise.resolve(t);

// null means "No Result"

/**
 * a transform that always returns `null`
 */

export const transformToNull = () => Promise.resolve(null);

/**
 * Normalizes result type of a *Prague* transform (turns undefined => null)
 * @param O The result type to normalize
 */

export type Flatten<T> = T extends Array<infer U> ? U : T;

export type Norm<O> = O extends undefined ? null : O;

/**
 * Normalizes the supplied function into a transform. Most *Prague* helpers normalize the functions you pass them 
 * @param fn The function to normalize. Can return a `Promise` or not, and can return `undefined` in place of `null`.
 */

export const from = <
    ARGS extends any[],
    O,
> (
    fn: (...args: ARGS) => Returns<O>,
) => {
    if (typeof fn !== 'function')
        throw new Error("I can't transform that.");

    return (...args: ARGS) => toPromise(fn(...args))
        .then(r => r == null ? null : r) as Promise<Norm<O>>;
}
