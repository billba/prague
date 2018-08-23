import { of as observableOf } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { Value, toObservable, Norm, combine } from './prague';

type ValueType<T> = T extends Value<infer V> ? Value<V> : never;

export function match<
    ARGS extends any[],
    O,
    ONVALUE,
    ONNULL = null,
> (
    getValue: (...args: ARGS) => O,
    onValue: (value: ValueType<Norm<O>>) => ONVALUE,
    onNull?: () => ONNULL,
) {
    return combine(
        getValue,
        o => {
            if (o === null)
                return onNull ? onNull() : null;

            if (o instanceof Value)
                return onValue(o as unknown as ValueType<Norm<O>>);
        
            throw "getValue transform should only return Value or null";
        },
    );
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
        combine(
            predicate,
            o => o instanceof Value && !o.value || !o ? null : trueValue,
        ),
        onTruthy,
        onFalsey
    );
}
