export { describe } from 'mocha';
import { use, expect } from 'chai';
import subset = require('chai-subset');
import { Output } from '../src/prague';
import { Observable } from 'rxjs';
import { defaultIfEmpty } from 'rxjs/operators';
use(subset);
export { expect } from 'chai';

export const isNull = (o: any) => {
    expect(o).is.null;
}

export const throwErr = () => {
    throw new Error();
}

export const passErr = (err: Error) => {
    throw err;
}

export const values = ["hi", 13, [1,2,3]];
export const nullablevalues = [... values, null, undefined];
