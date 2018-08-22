import { of as observableOf } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { Observableable, Value, from, toObservable } from './prague';

const getMatchError = new Error("getValue transform should only return Value or null");

export function match<
    ARGS extends any[],
    VALUE,
    ONVALUE,
    ONNULL = null,
> (
    getValue: (...args: ARGS) => Observableable<null | undefined | VALUE | Value<VALUE>>,
    onValue: (value: Value<VALUE>) => ONVALUE,
    onNull?: () => ONNULL,
) {
    return from((...args: ARGS) => from(getValue)(...args).pipe(
        map(o => {
            if (o instanceof Value)
                return onValue(o);
        
            if (o === null)
                return onNull ? onNull() : o;

            throw getMatchError;
        })
    ));
}

const trueValue = new Value(true);

export function matchIf <
    ARGS extends any[],
    ONTRUTHY,
    ONFALSEY
> (
    predicate: (...args: ARGS) => any,
    onTruthy: () => ONTRUTHY,
    onFalsey?: () => ONFALSEY,
) {
    return match(
        (...args: ARGS) => observableOf(args).pipe(
            map(args => predicate(...args)),
            flatMap(toObservable),
            map(o => o instanceof Value && !o.value || !o ? null : trueValue)
        ),
        onTruthy,
        onFalsey
    );
}
