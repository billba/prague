import { of as observableOf } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { Observableable, Value, from, pipe, toObservable } from './prague';
import { alwaysEmit, NoResult } from './noResult';

const getMatchError = new Error("getValue transform should only return Value");

export function match<
    ARGS extends any[],
    VALUE,
    ONVALUE,
    ONNOVALUE
> (
    getValue: (...args: ARGS) => Observableable<null | undefined | VALUE | Value<VALUE>>,
    onValue: (value: Value<VALUE>) => ONVALUE,
    onNoValue?: () => ONNOVALUE
) {
    const _onMatch   = from(onValue  );
    const _onNoMatch = from(onNoValue);

    return pipe(
        alwaysEmit(
            getValue
        ),
        result => {
            if (result instanceof Value)
                return _onMatch(result);
            
            if (result instanceof NoResult)
                return _onNoMatch();

            throw getMatchError;
        },
    );
}

const ifPredicateError = new Error("predicate must return true or false");

export function matchIf <
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
