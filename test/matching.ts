import { expect, throwErr, isNull } from './common';
import { match, matchIf, branch, combine, onlyContinueIf, pipe } from '../src/prague';

describe("branch", () => {
    it("should return first transform on Result", () =>
        combine(
            (a: string | null) => a,
            branch(
                a => a,
                () => "no",
            )
        )("yes")
        .then(o => {
            expect(o).equals("yes");
        })
    );

    it("should return second transform on null", () =>
        combine(
            (a: string | null) => a,
            branch(
                a => a,
                () => "no",
            )
        )(null)
        .then(o => {
            expect(o).equals("no");
        })
    );

    it("should return null on null when second transform is missing", () =>
        combine(
            (a: string | null) => a,
            branch(
                a => a,
            )
        )(null)
        .then(isNull)
    );
})

describe("match", () => {
    it("should emit null on null and no onNull handler", () =>
        match(
            () => undefined,
            throwErr,
        )()
        .then(isNull)
    );

    it("should call onNull handler on null", () =>
        match(
            () => undefined,
            throwErr,
            () => "hi",
        )()
        .then(m => {
            expect(m).equals("hi");
        })
    );

    it("should call onValue handler on value", () =>
        match(
            () => "hi",
            a => a,
            throwErr,
        )()
        .then(m => {
            expect(m).equals("hi");
        })
    );

    it("should pass through args", () =>
        match(
            (a: string, b: number) => a.repeat(b),
            a => a,
            throwErr,
        )("hi", 2)
        .then(m => {
            expect(m).equals("hihi");
        })
    );

    it("should emit null and not call onNull on Value when onResult emits null", () =>
        match(
            () => "hi",
            () => undefined,
            throwErr,
        )()
        .then(isNull)
    );
});

const falseyValues = [false, undefined, null, 0];
const truthyValues = [true, 13, "hi", () => "hi", { dog: "dog" }];

describe("matchIf", () => {
    falseyValues.forEach(value => {
        it("should emit null on ${value} and no onFalsey handler", () =>
            matchIf(
                () => value,
                throwErr,
            )()
            .then(isNull)
        );

        it("should call onFalse on ${value}", () =>
            matchIf(
                () => value,
                throwErr,
                () => "hi",
            )()
            .then(m => {
                expect(m).equals("hi");
            })
        );
    });

    it("should pass through arguments", () =>
        matchIf(
            (a: number, b: number) => a > b,
            () => "hi",
            throwErr,
        )(5, 2)
        .then(m => {
            expect(m).equals("hi");
        })
    );

    truthyValues.forEach(value => {
        it("should call onTruthy handler on ${value}", () =>
            matchIf(
                () => value,
                () => "hi",
            )()
            .then(m => {
                expect(m).equals("hi");
            })
        );
    });
});

describe("onlyContinueIf", () => {

    truthyValues.forEach(value => {
        it(`should continue on ${value}`, () =>
            pipe(
                onlyContinueIf(() => value),
                () => value,
            )()
            .then(m => {
                expect(m).equals(m);
            })
        );
    });

    falseyValues.forEach(value => {
        it(`should not continue on ${value}`, () =>
            pipe(
                onlyContinueIf(() => value),
                () => value,
            )()
            .then(isNull)
        );
    });
});
