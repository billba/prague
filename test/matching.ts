import { describe, expect, passErr, throwErr } from './common';
import { match, Match, if as _if } from '../src/prague';

describe("match", () => {
    it("should return undefined when no match and no onNoMatch handler", done => {
        match(
            () => undefined,
            throwErr,
        )().subscribe(m => {
            expect(m).is.undefined;
        }, passErr, done);
    });

    it("should call onNoMatch handler when no match", done => {
        match(
            () => undefined,
            throwErr,
            () => "hi"
        )().subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done);
    });

    it("should call onMatch handler when match", done => {
        match(
            () => "hi",
            a => a,
            throwErr,
        )().subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done);
    });

    it("should pass through args", done => {
        match(
            (a: string, b: number) => a.repeat(b),
            a => a,
            throwErr,
        )("hi", 2).subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hihi");
        }, passErr, done);
    });

    it("should throw on Action", done => {
        match(
            () => () => console.log("huh"),
            a => a,
            () => "hi",
        )().subscribe(throwErr, () => done(), throwErr);
    });
});

describe("_if", () => {
    const falseyValues = [false, undefined, null, 0];
    const truthyValues = [true, 13, "hi", () => "hi", { dog: "dog" }];

    falseyValues.map(value => {
        it("should return undefined on ${value} and no onFalse handler", done => {
            _if(
                () => value,
                throwErr,
            )().subscribe(m => {
                expect(m).is.undefined;
            }, passErr, done);
        });

        it("should call onFalse on ${value}", done => {
            _if(
                () => value,
                throwErr,
                () => "hi",
            )().subscribe(m => {
                expect(m).instanceof(Match);
                expect((m as Match<string>).value).equals("hi");
            }, passErr, done);
        });
    });

    it("should pass through arguments", done => {
        _if(
            (a: number, b: number) => a > b,
            () => "hi",
            throwErr,
        )(5, 2).subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done);
    });

    truthyValues.map(value => {
        it("should call onTrue handler on ${value}", done => {
            _if(
                () => value,
                () => "hi",
            )().subscribe(m => {
                expect(m).instanceof(Match);
                expect((m as Match<string>).value).equals("hi");
            }, passErr, done);
        });
    });
})