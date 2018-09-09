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

export const matchIf = <
    ARGS extends any[],
    ONTRUTHY,
    ONFALSEY = null,
> (
    predicate: (...args: ARGS) => any,
    onTruthy: () => ONTRUTHY,
    onFalsey?: () => ONFALSEY,
) => combine(
    predicate,
    o => o ? true : null,
    branch(onTruthy, onFalsey),
);

export const onlyContinueIf = <
    ARGS extends any[],
    O
> (
    predicate: (...args: ARGS) => Returns<O>,
) => combine(
    predicate,
    o => o || null,
);