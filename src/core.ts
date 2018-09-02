import { Observable, from as observableFrom, of as observableOf } from 'rxjs';
import { take, map, flatMap, filter, defaultIfEmpty } from 'rxjs/operators';

export type BaseType <T> =
    T extends Observable<infer BASETYPE> ? BASETYPE :
    T extends Promise<infer BASETYPE> ? BASETYPE :
    T;

export const toObservable = <T> (
    t: T,
) =>
    t instanceof Observable ? t.pipe(take(1)) :
    t instanceof Promise ? observableFrom(t) :
    observableOf(t);

export abstract class Result {
    private __result = "@@result";
}

// null is the "No Result"

export const transformToNull = () => observableOf(null);

export const filterOutNull = filter<Result>((o: Output) => o !== null);

export const nullIfEmpty = defaultIfEmpty(null);

export type Output = Result | null;

export type NullIfNullable<T> = T extends null ? null : never;

export interface ResultClass <
    T extends Result,
> {
    new (
        ...args: any[]
    ): T;
}

export class Action extends Result {
     
    action: () => Observable<any>;

    constructor (
        action: () => any,
    ) {
        super();
        
        if (action.length > 0)
            throw new Error("Actions must have zero arguments.");

        this.action = () => observableOf(action).pipe(
            map(action => action()),
            flatMap(toObservable),
        );
    }
}

export class Value <VALUE> extends Result {

    constructor (
        public value: VALUE,
    ) {
        super();
    }
}

type NormalizedOutput <O> =
    O extends undefined | null ? null :
    O extends Result ? O :
    O extends () => any ? Action :
    Value<O>;

export type Norm <O> = NormalizedOutput<BaseType<O>>;

export type Transform <
    ARGS extends any[],
    OUTPUT extends Output,
> = (...args: ARGS) => Observable<OUTPUT>;

export function from <
    ARGS extends any[] = [],
    O = null,
> (
    transform?: null | ((...args: ARGS) => O),
): Transform<ARGS, Norm<O>>

export function from (
    transform?: any,
) {
    if (!transform)
        return transformToNull;

    if (typeof transform !== 'function')
        throw new Error("I can't transform that.");

    return (...args: any[]) => observableOf(transform).pipe(
        map(transform => transform(...args)),
        flatMap(toObservable),
        map(o =>
            o == null ? null :
            o instanceof Result ? o :
            typeof o === 'function' ? new Action(o) :
            new Value(o)
        ),
    );
}
