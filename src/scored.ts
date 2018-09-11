import { Transform, pipe, multiple } from './prague';

export class Scored <
    RESULT,
> {
    private constructor(
        public result: RESULT,
        public score = 1,
    ) {
        if (result == null)
            throw "Result cannot be null";

        if (score === 0 || score > 1)
            throw `Score is ${score} but must be be > 0 and <= 1 (consider using Scored.from)`;
    }

    private static normalizedScore (
        score?: number,
    ) {
        return score != null && score >= 0 && score < 1
            ? score
            : 1;
    }

    static from (
        o: undefined | null,
        score?: number,
    ): null;
    
    static from (
        o: any,
        score: 0,
    ): null;
    
    static from <
        O,
    >(
        o: Scored<O> | O,
        score?: number,
    ): Scored<O>;

    static from (
        o: any,
        score?: number
    ) {
        if (o == null || score === 0)
            return null;

        if (o instanceof Scored) {
            if (score === undefined)
                return o;

            score = Scored.normalizedScore(score);

            return score === o.score
                ? o
                : new Scored(o.result, score);
        }

        return new Scored(o, Scored.normalizedScore(score));
    }

    static unwrap <
        RESULT,
    >(
        result: Scored<RESULT> | RESULT,
    ) {
        return result instanceof Scored
            ? result.result
            : result;
    }
}

export const sort = <O> (
    ascending = false,
) => (o: O) => Array.isArray(o)
    ? o
        .map(result => Scored.from(result))
        .sort((a, b) => ascending ? (a.score - b.score) : (b.score - a.score))
    : o;

export interface TopOptions {
    maxResults?: number;
    tolerance?: number;
}

export function top <
    RESULT,
> (
    options?: TopOptions,
): Transform<[RESULT], any> {

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

    return async (result: RESULT) => {
        if (!Array.isArray(result))
            return result;

        let top: Scored<any>[] = [];

        for (const _result of result) {
            if (!(_result instanceof Scored))
                throw "top must only be called on Array of Scored";

            if (top.length >= maxResults || _result.score + tolerance < result[0].score)
                break;
            
            top.push(_result);
        }

        return top.length === 1 ? top[0] : top;
    }
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
