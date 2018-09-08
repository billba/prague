import { Returns, combine, Transform, from } from './prague';
import { transformToNull } from './core';

export const branch = <
    O,
    ONRESULT,
    ONNULL = null,
> (
    onResult: (result: NonNullable<O>) => Returns<ONRESULT>,
    onNull?: () => Returns<ONNULL>,
) => {
    const _onResult = from(onResult);
    const _onNull = onNull ? from(onNull) : transformToNull;

    return ((o: O) => o === null ? _onNull() : _onResult(o as NonNullable<O>)) as Transform<[O], ONRESULT | ONNULL>;
}

export const match = <
    ARGS extends any[],
    O,
    ONRESULT,
    ONNULL = null,
> (
    transform: (...args: ARGS) => Returns<O>,
    onResult: (result: NonNullable<O>) => Returns<ONRESULT>,
    onNull?: () => Returns<ONNULL>,
) => combine(
    transform,
    branch(onResult, onNull),
);

export const isTrue = <
    ARGS extends any[],
> (
    predicate: (...args: ARGS) => any,
) => combine(
    predicate,
    o => o ? true : null,
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
