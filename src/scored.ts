import { Result, transformResult, Multiple, Transform, pipe, multiple, Value } from './prague';
import { from as observableFrom } from "rxjs";
import { takeWhile, toArray, map, tap as rxtap } from 'rxjs/operators';

export class Scored extends Result {

    score: number;

    constructor(
        public result: Result,
        score?: number,
    ) {
        super();
        this.score = Scored.normalizedScore(score);
    }

    static normalizedScore (
        score?: number,
    ) {
        return score != null && score >= 0 && score < 1
            ? score
            : 1;
    }

    static from (
        result: Result,
        score?: number,
    ) {
        if (result instanceof Scored) {
            if (score === undefined)
                return result;

            score = Scored.normalizedScore(score);

            return score === result.score
                ? result
                : new Scored(result.result, score);
        }

        return new Scored(result, score);
    }

    static unwrap (
        result: Result,
    ) {
        return result instanceof Scored
            ? result.result
            : result;
    }
}

export const scoredValue = <VALUE> (
    value: VALUE,
    score?: number
) => new Scored(new Value(value), score);

export const sort = (
    ascending = false,
) => transformResult(Multiple, r => new Multiple(r
    .results
    .map(result => Scored.from(result))
    .sort((a, b) => ascending ? (a.score - b.score) : (b.score - a.score))
));

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
        const result = multiple.results[0];
        if (!(result instanceof Scored))
            throw "top must only be called on Multiple of Scored";

        const highScore = result.score;

        return observableFrom(multiple.results as Scored[]).pipe(
            rxtap(result => {
                if (!(result instanceof Scored))
                    throw "top must only be called on Multiple of Scored";
            }),
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
        Scored.unwrap,
    );
}
