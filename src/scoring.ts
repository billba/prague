import { Result, Transform, Norm, from } from "./prague";
import { from as observableFrom, of as observableOf, empty} from "rxjs";
import { flatMap, takeWhile, toArray, map } from "rxjs/operators";

export class Multiple extends Result {
    constructor (
        public results: Result[],
    ) {
        super();
    }
}

export function best <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => R0
]): Transform<ARGS, Norm<R0>>;

export function best <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1
]): Transform<ARGS, Norm<R0 | R1>>;

export function best <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => R0,
    (...args: ARGS) => R1,
    (...args: ARGS) => R2
]): Transform<ARGS, Norm<R0 | R1 | R2>>;

export function best <
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
]): Transform<ARGS, Norm<R0 | R1 | R2 | R3>>;

export function best <
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
    (...args: ARGS) => R3,
    (...args: ARGS) => R4
]): Transform<ARGS, Norm<R0 | R1 | R2 | R3 | R4>>;

export function best <
    ARGS extends any[],
> (...args:
    ((...args: ARGS) => any)[]
): Transform<ARGS, Result | undefined>;

export function best (
    ...args: any[]
) {
    // let tolerance: number;
    // let transforms: ((...args: any[]) => any)[];

    // if (typeof args[0] === 'function') {
    //     tolerance = 0;
    //     transforms = args;
    // } else {
    //     [tolerance, transforms] = args;
    // }

    let tolerance = 0;
    let transforms: ((...args: any[]) => any)[] = args;

    const _transforms = observableFrom(transforms.map(transform => from(transform)));

    return (...args: any[]) => _transforms.pipe(
        flatMap(transform => transform(... args)),
        flatMap(result => 
            result === undefined ? empty() :
            result instanceof Multiple ? observableFrom(result.results) :
            observableOf(result)
        ),
        toArray(),
        flatMap(results => observableFrom(results.sort((a, b) => b.score - a.score)).pipe(
            takeWhile(result => result.score + tolerance >= results[0].score),
            toArray(),
            map(results =>
                results.length === 0 ? undefined :
                results.length === 1 ? results[0] :
                new Multiple(results)
            ),
        ))
    );
}

export const defaultDisambiguator = from((result: Result) =>
    result instanceof Multiple ? result.results[0]
    : result
);
