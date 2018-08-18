import { Result, first } from './prague';

export class NoResult extends Result {
}

export function emitNoResult <
    ARGS extends any[],
    R,
> (
    transform: (...args: ARGS) => R,
    score?: number,
) {
    return first(
        transform,
        () => new NoResult(score),
    )
}