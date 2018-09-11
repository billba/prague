import { expect, isNull } from './common';
import { re } from '../src/util';

describe("re", () => {
    it("should return null for no match", () =>
        re(/hey/)
        ("ho")
        .then(isNull)
    );

    it("should return null when no indicated capture group", () =>
        re(/hey/, 1)
        ("hey")
        .then(isNull)
    );

    it("should return match", () =>
        re(/hey/)
        ("hey")
        .then(m => {
            expect(m).deep.equals(["hey"])
        })
    );

    it("should return capture group", () =>
        re(/(hey)/, 1)
        ("hey")
        .then(m => {
            expect(m).equals("hey")
        })
    );
});