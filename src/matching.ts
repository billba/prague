import { of } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { Observableable, Match, from, pipe, toObservable } from './prague';

const getMatchError = new Error("matching function should only return MatchRoute or NoRoute");

export function match<
    ARGS extends any[],
    VALUE,
    ONMATCH,
    ONNOMATCH
>(
    getMatch: (...args: ARGS) => Observableable<null | undefined | VALUE | Match<VALUE>>,
    onMatch: (match: Match<VALUE>) => ONMATCH,
    onNoMatch?: () => ONNOMATCH
) {
    const _getMatch = from(getMatch);
    const _onMatch = from(onMatch);
    const _onNoMatch = from(onNoMatch);

    return pipe(_getMatch, result => {
        if (!result)
            return _onNoMatch();

        if (result instanceof Match)
            return _onMatch(result);

        throw getMatchError;
    });
}

const ifPredicateError = new Error("predicate must return true or false");

function _if<
    ARGS extends any[],
    ONMATCH,
    ONNOMATCH
> (
    predicate: (...args: ARGS) => any,
    onMatch: () => ONMATCH,
    onNoMatch?: () => ONNOMATCH
) {
    return match(pipe((...args: ARGS) => of(args).pipe(
        map(args => predicate(...args)),
        flatMap(toObservable),
        map(result => result instanceof Match ? !!result.value : !!result)),
        route => {
            if (route instanceof Match) {
                if (route.value === true)
                    return true;

                if (route.value === false)
                    return undefined;
            }
            throw ifPredicateError;
        }),
        onMatch,
        onNoMatch
    );
}
export { _if as if };