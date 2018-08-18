import { Result, first, from } from './prague';

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
        from(transform),
        () => new NoResult(score),
    )
}