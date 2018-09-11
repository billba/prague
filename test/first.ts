import { expect, throwErr, isNull } from './common';
import { first } from '../src/prague';

describe("first", () => {
    it("should emit null on no transforms", () =>
        first(
        )()
        .then(isNull)
    );

    it("should emit null when first transform returns null", () =>
        first(
            () => null
        )()
        .then(isNull)
    );

    it("should return result of first transform when value", () =>
        first(
            () => "hi"
        )()
        .then(m => {
            expect(m).equals("hi");
        })
    );

    it("returns result of second transform when first returns null", () =>
        first(
            () => null,
            () => "hi",
        )()
        .then(m => {
            expect(m).equals("hi");
        })
    );

    it("should ignore second transform when first returns result", () =>
        first(
            () => "hi",
            throwErr,
        )()
        .then(m => {
            expect(m).equals("hi");
        })
    );

    it("passes through same arguments to all functions", () =>
        first(
            (a: string, b: number) => undefined,
            (a, b) => a.repeat(b),
        )("hi", 2)
        .then(m => {
            expect(m).equals("hihi");
        })
    );
});

