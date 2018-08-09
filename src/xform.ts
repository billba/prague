import { Observable, from, of } from 'rxjs';
import { take, map, flatMap, concatMap, filter, reduce } from 'rxjs/operators';

export type BaseType <T> =
    T extends Observable<infer BASETYPE> ? BASETYPE :
    T extends Promise<infer BASETYPE> ? BASETYPE :
    T;

export const toObservable = <T> (
    t: Observable<T> | Promise<T> | T,
) =>
    t instanceof Observable ? t.pipe(take(1)) :
    t instanceof Promise ? from(t) :
    of(t);

abstract class Result {

    private result = "result";
}
            
class None extends Result {

    private none = "none";

    private constructor() {
        super();
    }

    static singleton = new None();
}

const none = None.singleton;

class Action extends Result {
     
    action: () => Observable<any>;

    constructor (
        action: () => any,
    ) {
        super();
        
        if (action.length > 0)
            throw new Error("Actions must have zero arguments.");

        this.action = () => of(action).pipe(
            map(action => action()),
            flatMap(toObservable)
        );
    }
}

class Match <
    VALUE
> extends Result {

    constructor (
        public value: VALUE,
    ) {
        super();
    }
}

type NormalizedResult<R> =
    R extends undefined ? None :
    R extends Result ? R :
    R extends () => any ? Action :
    Match<R>;

type Norm<R> = NormalizedResult<BaseType<R>>;

const normalizedResult = (
    result: any,
) => {
    if (result instanceof Result)
        return result;

    if (result == null)
        return none;

    if (typeof result === 'function')
        return new Action(result);

    return new Match(result);
};

type Xform <
    ARGS extends any[],
    RESULT extends Result = Result
> = (...args: ARGS) => Observable<RESULT>;

function _from <
    ARGS extends any[],
    R,
> (
    transform?: (...args: ARGS) => R,
): Xform<ARGS, Norm<R>>;

function _from (
    transform: any,
) {
    if (typeof transform !== 'function')
        throw new Error("I can't transform that.");

    return (...args: any[]) => of(transform).pipe(
        map(transform => transform(...args)),
        flatMap(toObservable),
        map(result => normalizedResult(result)),
    );
}

function first <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => R0
]): Xform<ARGS, Norm<R0>>;

function first <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1
]): Xform<ARGS, Norm<R0 | R1>>;

function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2
]): Xform<ARGS, Norm<R0 | R1 | R2>>;

function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2,
    (...args: ARGS) => R3
]): Xform<ARGS, Norm<R0 | R1 | R2 | R3>>;

function first <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2,
    (...args: ARGS) => R3
]): Xform<ARGS, Norm<R0 | R1 | R2 | R3 | R4>>;

function first <
    ARGS extends any[],
> (...args:
    ((...args: ARGS) => any)[]
): Xform<ARGS, Result>;

function first (
    ...transforms: ((...args: any[]) => any)[]
) {
    const _transforms = from(transforms.map(transform => _from(transform)));

    return (...args: any[]) => _transforms.pipe(
        // we put concatMap here because it forces everything to after it to execute serially
        concatMap((transform, i) => transform(...args).pipe(
            // ignore every No but the last one
            filter(result => i === transforms.length - 1 || !(result instanceof None)),
        )),
        // Stop when we find one that matches
        take(1), 
    );
}

function pipe <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => R0
]): Xform<ARGS, Norm<R0>>;

function pipe <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1
]): Xform<ARGS, Norm<R1>>;

function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1,
    (arg: Norm<R1>) => R2
]): Xform<ARGS, Norm<R2>>;

function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1,
    (arg: Norm<R1>) => R2,
    (arg: Norm<R2>) => R3
]): Xform<ARGS, Norm<R3>>;

function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => R0,
    (arg: Norm<R0>) => R1,
    (arg: Norm<R1>) => R2,
    (arg: Norm<R2>) => R3,
    (arg: Norm<R2>) => R4
]): Xform<ARGS, Norm<R4>>;

function pipe <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => Result,
    ...functions: ((... args: any[]) => Result)[]
): Xform<ARGS, Result>;

function pipe (
    ...transforms: any[]
) {
    const _transforms = from(transforms.map(transform => _from(transform)));

    return (...args: any[]) => _transforms.pipe(
        reduce(
            (args: any[], transform: Xform<any[], any>) => [transform(...args)],
            args,
        ),
        map(x => x[0]),
    )
}

const f = first(
    (a: string) => a,
    a => Promise.resolve("hi"),
    a => "13",
    a => of(new Match("hi")),
)

const p = pipe(
    f,
    // a => a,
    x => () => console.log(x.value),
    y => "Hi",
    y => y
)
