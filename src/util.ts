import { match, Value } from './prague';
import { first } from './first';

export const re = (regexp: RegExp) => (text: string) => regexp.exec(text);
