export { describe } from 'mocha';
import { use} from 'chai';
import subset = require('chai-subset');
use(subset);
export { expect } from 'chai';

export const throwErr = () => {
    throw new Error();
}

export const passErr = (err: Error) => {
    throw err;
}

export const values = ["hi", 13, [1,2,3]];
export const nullablevalues = [... values, null, undefined];
