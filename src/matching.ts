import { of as observableOf } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { Observableable, Value, from, pipe, toObservable, first, tap } from './prague';

const getMatchError = new Error("matching function should only return Value");

export function match<
    ARGS extends any[],
    VALUE,
    ONMATCH,
    ONNOMATCH
> (
    getMatch: (...args: ARGS) => Observableable<null | undefined | VALUE | Value<VALUE>>,
    onMatch: (value: Value<VALUE>) => ONMATCH,
    onNoMatch?: () => ONNOMATCH
) {
    return first(
        pipe(
            getMatch,
            tap(result => {
                if (!(result instanceof Value))
                    throw getMatchError;
            }),
            onMatch,
        ),
        onNoMatch,
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
            (...args: ARGS) => observableOf(args).pipe(
                map(args => predicate(...args)),
                flatMap(toObservable),
                map(result => result instanceof Value ? !!result.value : !!result)
            ),
            result => {
                if (result instanceof Value) {
                    if (result.value === true)
                        return true;

                    if (result.value === false)
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