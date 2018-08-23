import { of as observableOf } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import { Value, from, toObservable, Norm } from './prague';

const getMatchError = new Error("getValue transform should only return Value or null");

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
    return from((...args: ARGS) => from(getValue)(...args).pipe(
        map(o => {
            if (o === null)
                return onNull ? onNull() : null;

            if (o instanceof Value)
                return onValue(o as unknown as ValueType<Norm<O>>);
        
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
