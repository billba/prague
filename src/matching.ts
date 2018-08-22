import { of as observableOf } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { Observableable, Value, from, toObservable, NoResult } from './prague';

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
        map(o => {
            if (o instanceof Value)
                return onValue(o);
        
            if (o === NoResult.singleton)
                return onNoValue ? onNoValue() : o;

            throw getMatchError;
        })
    ));
}

const trueValue = new Value(true);

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
        (...args: ARGS) => observableOf(args).pipe(
            map(args => predicate(...args)),
            flatMap(toObservable),
            map(o =>
                o === NoResult.singleton ||
                o instanceof Value && !o.value ||
                !o
                    ? NoResult.singleton
                    : trueValue
            )
        ),
        onTrue,
        onFalse
    );
}
