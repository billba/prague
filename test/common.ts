export { describe } from 'mocha';
import { use, expect } from 'chai';
import subset = require('chai-subset');
import { NoResult, Result } from '../src/prague';
use(subset);
export { expect } from 'chai';

export const isNoResult = (r: Result) => {
    expect(r).equals(NoResult.singleton);
}

export const throwErr = () => {
    throw new Error();
}

export const passErr = (err: Error) => {
    throw err;
}

export const values = ["hi", 13, [1,2,3]];
export const nullablevalues = [... values, null, undefined];
