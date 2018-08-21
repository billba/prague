import { of as observableOf } from 'rxjs';
import { map, flatMap, tap } from 'rxjs/operators';
import { Observableable, Value, from, pipe, toObservable, NoResult, log } from './prague';

const getMatchError = new Error("getValue transform should only return Value or NoResult");

export function match<
    ARGS extends any[],
    VALUE,
    ONVALUE,
    ONNOVALUE = null,
> (
    getValue: (...args: ARGS) => Observableable<null | undefined | NoResult | VALUE | Value<VALUE>>,
    onValue: (value: Value<VALUE>) => ONVALUE,
    onNoValue?: () => ONNOVALUE,
) {
    return from((...args: ARGS) => from(getValue)(...args).pipe(
        tap(console.log),
        map(result => {
            if (result instanceof Value)
                return onValue(result);
        
            if (result === NoResult.singleton)
                return onNoValue ? onNoValue() : result;

            throw getMatchError;
        })
    ));
}

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
            result => result.value === true ? result : NoResult.singleton,
        ),  
        onTrue,
        onFalse
    );
}
