import { Value, Norm, combine, Transform, Output, from } from './prague';
import { transformToNull } from './core';

type ValueType<T> = T extends Value<infer V> ? Value<V> : never;

export const branch = <
    O extends Output,
    ONRESULT,
    ONNULL = null,
> (
    onResult: (result: NonNullable<O>) => ONRESULT,
    onNull?: () => ONNULL,
) => {
    const _onResult = from(onResult);
    const _onNull = onNull ? from(onNull) : transformToNull;

    return ((o: O) => o === null ? _onNull() : _onResult(o as NonNullable<O>)) as Transform<[O], Norm<ONRESULT> | Norm<ONNULL>>;
}

export const match = <
    ARGS extends any[],
    O,
    ONRESULT,
    ONNULL = null,
> (
    transform: (...args: ARGS) => O,
    onResult: (result: NonNullable<Norm<O>>) => ONRESULT,
    onNull?: () => ONNULL,
) => combine(
    transform,
    branch(onResult, onNull),
);

const trueValue = new Value(true);

export const isTrue = <
    ARGS extends any[],
> (
    predicate: (...args: ARGS) => any,
) => combine(
    predicate,
    o => o instanceof Value && !o.value || !o ? null : trueValue,
);

export const matchIf = <
    ARGS extends any[],
    ONTRUTHY,
    ONFALSEY = null,
> (
    predicate: (...args: ARGS) => any,
    onTruthy: () => ONTRUTHY,
    onFalsey?: () => ONFALSEY,
) => combine(
    isTrue(predicate),
    branch(onTruthy, onFalsey),
);
