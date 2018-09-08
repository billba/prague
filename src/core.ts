import { Observable, from as observableFrom, of as observableOf } from 'rxjs';
import { take, map, flatMap, filter, defaultIfEmpty } from 'rxjs/operators';

export type Returns<T> = Observable<T> | Promise<T> | T;

export const toObservable = <T> (
    t: Returns<T>,
) =>
    t instanceof Observable ? t.pipe(take(1)) :
    t instanceof Promise ? observableFrom(t) :
    observableOf(t);

// null means "No Result"

export const transformToNull = () => observableOf(null);

export const filterOutNull = filter(o => o !== null);

export const nullIfEmpty = defaultIfEmpty(null);

export type NullIfNullable<T> = T extends null ? null : never;

export type Transform <
    ARGS extends any[],
    O,
> = (...args: ARGS) => Observable<O>;

export function from <
    ARGS extends any[] = [],
    O = null,
> (
    transform?: null | ((...args: ARGS) => Returns<O>),
): Transform<ARGS, O>

export function from (
    transform?: null | ((...args: any[]) => any),
) {
    if (!transform)
        return transformToNull;

    if (typeof transform !== 'function')
        throw new Error("I can't transform that.");

    return (...args: any[]) => observableOf(transform).pipe(
        map(transform => transform(...args)),
        flatMap(toObservable),
    );
}
