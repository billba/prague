import { expect } from 'chai';
export { expect } from 'chai';

export const isNull = (o: any) => {
    expect(o == null).is.true;
}

export const throwErr = () => {
    throw new Error();
}

export const passErr = (err: Error) => {
    throw err;
}

export const values = ["hi", 13, [1,2,3], () => {}];
export const nullablevalues = [... values, null, undefined];
