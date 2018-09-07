import { Output, Transform, Norm, from, Result, filterOutNull, transformToNull } from "./prague";
import { from as observableFrom, of as observableOf } from "rxjs";
import { flatMap, toArray, map } from "rxjs/operators";

export class Multiple extends Result {
    constructor (
        public results: Result[],
    ) {
        super();
    }
}

export function multiple(): Transform<[], null>;

export function multiple <
    ARGS extends any[],
    R0,
> (...transforms: [
    (...args: ARGS) => R0
]): Transform<ARGS, Norm<R0>>;

export function multiple <
    ARGS extends any[],
    R0,
    R1,
> (...transforms: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1
]): Transform<ARGS, Norm<R0 | R1> | Multiple>;

export function multiple <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...transforms: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2
]): Transform<ARGS, Norm<R0 | R1 | R2> | Multiple>;

export function multiple <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...transforms: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2,
    (...args: ARGS) => R3
]): Transform<ARGS, Norm<R0 | R1 | R2 | R3> | Multiple>;

export function multiple <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...transforms: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2,
    (...args: ARGS) => R3,
    (...args: ARGS) => R4
]): Transform<ARGS, Norm<R0 | R1 | R2 | R3 | R4> | Multiple>;

export function multiple <
    ARGS extends any[],
> (...args:
    ((...args: ARGS) => any)[]
): Transform<ARGS, Output>;

export function multiple (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    const _transforms = observableFrom(transforms.map(transform => from(transform) as Transform<any[], Output>));

    return ((...args: any[]) => _transforms.pipe(
        flatMap(transform => transform(...args)),
        filterOutNull,
        flatMap(result => result instanceof Multiple ? observableFrom(result.results) : observableOf(result)),
        toArray(),
        map<Result[], Output>(results =>
            results.length === 0 ? null : 
            results.length === 1 ? results[0] :
            new Multiple(results)
        ),
    )) as Transform<any[], any>;
}
