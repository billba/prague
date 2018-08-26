import { Value, Norm, combine, Transform } from './prague';

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
    ) as Transform<ARGS, Norm<ONVALUE> | Norm<ONNULL>>;
}

const trueValue = new Value(true);

export function matchIf <
    ARGS extends any[],
    ONTRUTHY,
    ONFALSEY = null,
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
    ) as Transform<ARGS, Norm<ONTRUTHY> | Norm<ONFALSEY>>;
}
