import { match, Value } from './prague';

export const re = (regexp: RegExp) => (text: string) => regexp.exec(text);

export const matchRE = <
    ONMATCH,
    ONNOMATCH = null,
> (
    regexp: RegExp,
    onMatch: (value: Value<RegExpExecArray>) => ONMATCH,
    onNoMatch?: () => ONNOMATCH,
) => match(re(regexp), onMatch, onNoMatch);

export const ifMatchRE = <
    ONMATCH,
    ONNOMATCH = null,
> (
    regexp: RegExp,
    onMatch: () => ONMATCH,
    onNoMatch?: () => ONNOMATCH,
) => match(re(regexp), onMatch, onNoMatch);
