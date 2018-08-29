import { Output, Transform, Norm, from, pipe, Result, filterOutNull, transformResult, transformToNull } from "./prague";
import { from as observableFrom, of as observableOf } from "rxjs";
import { flatMap, toArray, map, takeWhile } from "rxjs/operators";

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

export const sort = (
    ascending = false,
) => transformResult(Multiple, r => new Multiple(r.results.sort((a, b) => ascending ? (a.score - b.score) : (b.score - a.score))));

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
        if (options.maxResults) {
            if (typeof options.maxResults !== 'number' || options.maxResults < 1)
                throw new Error ("maxResults must be a number >= 1");

            maxResults = options.maxResults;
        }
        
        if (options.tolerance) {
            if (typeof options.tolerance !== 'number' || options.tolerance < 0 || options.tolerance > 1)
                throw new Error ("tolerance must be a number >= 0 and <= 1");

            tolerance  = options.tolerance;
        }
    }

    return transformResult(Multiple, multiple => {
        const highScore = multiple.results[0].score;

        return observableFrom(multiple.results).pipe(
            takeWhile((m, i) => i < maxResults && m.score + tolerance >= highScore),
            toArray(),
            map(results => results.length === 1 ? results[0] : new Multiple(results)),
        )
    });
}

export function best <
    ARGS extends any[],
> (
    ...transforms: ((...args: ARGS) => any)[]
) {
    return pipe(
        multiple(...transforms),
        sort(),
        top({
            maxResults: 1,
        }),
    );
}
