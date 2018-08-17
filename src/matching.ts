import { of } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { Observableable, Match, from, pipe, toObservable, first, tap } from './prague';

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
    return first(
        pipe(
            getMatch,
            tap(result => {
                if (!(result instanceof Match))
                    throw getMatchError;
            }),
            onMatch,
        ),
        from(onNoMatch),
    )
}

const ifPredicateError = new Error("predicate must return true or false");

function _if<
    ARGS extends any[],
    ONTRUE,
    ONFALSE
> (
    predicate: (...args: ARGS) => any,
    onTrue: () => ONTRUE,
    onFalse?: () => ONFALSE,
) {
    return match(
        pipe(
            (...args: ARGS) => of(args).pipe(
                map(args => predicate(...args)),
                flatMap(toObservable),
                map(result => result instanceof Match ? !!result.value : !!result)
            ),
            route => {
                if (route instanceof Match) {
                    if (route.value === true)
                        return true;

                    if (route.value === false)
                        return undefined;
                }
                throw ifPredicateError;
            }
        ),
        onTrue,
        onFalse
    );
}
export { _if as if };