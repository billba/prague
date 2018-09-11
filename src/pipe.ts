import { Transform, Returns, from, toPromise, NullIfNullable, transformToNull } from "./prague";

export function pipe(): Transform<[], null>;

export function pipe <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => Returns<R0>
]): Transform<ARGS, R0>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>
]): Transform<ARGS, NullIfNullable<R0> | R1>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>,
    (arg: NonNullable<R1>) => Returns<R2>
]): Transform<ARGS, NullIfNullable<R0 | R1> | R2>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>,
    (arg: NonNullable<R1>) => Returns<R2>,
    (arg: NonNullable<R2>) => Returns<R3>
]): Transform<ARGS, NullIfNullable<R0 | R1 | R2> | R3>;

export function pipe <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: NonNullable<R0>) => Returns<R1>,
    (arg: NonNullable<R1>) => Returns<R2>,
    (arg: NonNullable<R2>) => Returns<R3>,
    (arg: NonNullable<R3>) => Returns<R4>
]): Transform<ARGS, NullIfNullable<R0 | R1 | R2 | R3> | R4>;

export function pipe <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => any,
    ...transforms: ((result: any) => any)[]
): Transform<ARGS, any>;

export function pipe (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    const _transforms = transforms.map(from);

    return (async (...args: any[]) => {
        let o = null;

        for (const transform of _transforms) {
            o = await transform(...args);
            if (o === null)
                return null;
            
            args = [o];
        }

        return o;
    }) as Transform<any[], any>;
}

export const tap = <
    RESULT,
> (
    fn: (result: RESULT) => any,
): Transform<[RESULT], RESULT> =>
    (result: RESULT) => toPromise(fn(result))
        .then(() => result);

export const log = tap(console.log);

export const doAction = tap(o => {
    if (typeof o === 'function')
        return o();
});

export function run <
    ARGS extends any[],
    O
> (
    transform: (...args: ARGS) => O
) {
    return pipe(
        transform,
        doAction,
    );
}

export function combine (): Transform<[], null>;

export function combine <
    ARGS extends any[],
    R0,
> (...args: [
    (...args: ARGS) => Returns<R0>
]): Transform<ARGS, R0>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>
]): Transform<ARGS, R1>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>,
    (arg: R1) => Returns<R2>
]): Transform<ARGS, R2>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>,
    (arg: R1) => Returns<R2>,
    (arg: R2) => Returns<R3>
]): Transform<ARGS, R3>;

export function combine <
    ARGS extends any[],
    R0,
    R1,
    R2,
    R3,
    R4,
> (...args: [
    (...args: ARGS) => Returns<R0>,
    (arg: R0) => Returns<R1>,
    (arg: R1) => Returns<R2>,
    (arg: R2) => Returns<R3>,
    (arg: R3) => Returns<R4>
]): Transform<ARGS, R4>;

export function combine <
    ARGS extends any[],
> (
    transform: (...args: ARGS) => any,
    ...transforms: ((arg: any) => any)[]
): Transform<ARGS, any>;

export function combine (
    ...transforms: ((...args: any[]) => any)[]
) {
    if (transforms.length === 0)
        return transformToNull;

    const _transforms = transforms.map(from);

    return (async (...args: any[]) => {
        for (const transform of _transforms) {
            args = [await transform(...args)];
        }

        return args[0];
    }) as Transform<any[], any>;
}
