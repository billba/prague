export type Returns<T> = Promise<T> | T;

export const toPromise = <T> (
    t: Returns<T>,
) => t instanceof Promise ? t : Promise.resolve(t);

// null means "No Result"

export const transformToNull = () => Promise.resolve(null);

export type NullIfNullable<T> = T extends null ? null : never;

export type Transform <
    ARGS extends any[],
    O,
> = (...args: ARGS) => Promise<O>;

export const from = <
    ARGS extends any[],
    O,
> (
    transform: (...args: ARGS) => Returns<O>,
) => {
    if (typeof transform !== 'function')
        throw new Error("I can't transform that.");

    return ((...args: ARGS) => toPromise(transform(...args))
        .then(r => r == null ? null : r)
    ) as Transform<ARGS, O>;
}
