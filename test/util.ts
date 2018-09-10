import { expect, passErr, isNull } from './common';
import { re } from '../src/util';
import { defaultIfEmpty } from 'rxjs/operators';

describe("re", () => {
    it("should return null for no match", done => {
        re(/hey/)("ho")
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done);
    });

    it("should return null when no indicated capture group", done => {
        re(/hey/, 1)("hey")
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done);
    });

    it("should return match", done => {
        re(/hey/)("hey")
        .pipe(defaultIfEmpty(13))
        .subscribe(m => {
            expect(m).deep.equals(["hey"])
        }, passErr, done);
    });

    it("should return capture group", done => {
        re(/(hey)/, 1)("hey")
        .pipe(defaultIfEmpty(13))
        .subscribe(m => {
            expect(m).equals("hey")
        }, passErr, done);
    });

});