import { Result, Transform, Norm, from, pipe } from "./prague";
import { from as observableFrom, of as observableOf, empty} from "rxjs";
import { flatMap, toArray, map, takeWhile } from "rxjs/operators";

export class Multiple extends Result {
    constructor (
        public results: Result[],
    ) {
        super();
    }
}

export function sorted <
    ARGS extends any[],
    R0,
> (...transforms: [
    (...args: ARGS) => R0
]): Transform<ARGS, Norm<R0>>;

export function sorted <
    ARGS extends any[],
    R0,
    R1,
> (...transforms: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1
]): Transform<ARGS, Norm<R0 | R1> | Multiple>;

export function sorted <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...transforms: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2
]): Transform<ARGS, Norm<R0 | R1 | R2> | Multiple>;

export function sorted <
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

export function sorted <
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

export function sorted <
    ARGS extends any[],
> (...args:
    ((...args: ARGS) => any)[]
): Transform<ARGS, Result>;

export function sorted (
    ...transforms: ((...args: any[]) => any)[]
) {
    const _transforms = observableFrom(transforms.map(transform => from(transform)));

    return (...args: any[]) => _transforms.pipe(
        flatMap(transform => transform(...args)),
        flatMap(result => 
            result === undefined ? empty() :
            result instanceof Multiple ? observableFrom(result.results) :
            observableOf(result)
        ),
        toArray(),
        flatMap(results => observableFrom(results.sort((a, b) => b.score - a.score)).pipe(
            toArray(),
            map(results =>
                results.length === 0 ? undefined :
                results.length === 1 ? results[0] :
                new Multiple(results)
            ),
        ))
    );
}

export interface TopOptions {
    maxResults?: number;
    tolerance?: number;
}

export function top <
    RESULT extends Result,
> (
    options?: TopOptions,
): Transform<[RESULT], Result> {
    let maxResults = Number.POSITIVE_INFINITY;
    let tolerance  = 0;

    if (options) {
        if (typeof options.maxResults === 'number')
            maxResults = options.maxResults;
        
        if (typeof options.tolerance  === 'number')
            tolerance  = options.tolerance;
    }

    return from((result: RESULT) => result instanceof Multiple
        ? observableFrom(result.results).pipe(
            takeWhile((m, i) => i < maxResults && m.score + tolerance >= result.results[0].score),
            toArray(),
            map(results => results.length === 1 ? results[0] : new Multiple(results))
        )
        : result
    );
}

export function best <
    ARGS extends any[],
> (
    ...transforms: ((...args: ARGS) => any)[]
) {
    return pipe(
        sorted(...transforms),
        top({
            maxResults: 1,
        }),
    );
}
