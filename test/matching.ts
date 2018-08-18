import { describe, expect, passErr, throwErr } from './common';
import { match, Match, if as _if, emitNoResult } from '../src/prague';

describe("match", () => {
    it("should not emit when no match and no onNoMatch handler", done => {
        match(
            () => undefined,
            throwErr,
        )().subscribe(throwErr, passErr, done);
    });

    it("should call onNoMatch handler when no match", done => {
        emitNoResult(
            match(
                () => undefined,
                throwErr,
                () => "hi"
            )
        )().subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done);
    });

    it("should call onMatch handler when match", done => {
        emitNoResult(
            match(
                () => "hi",
                a => a,
                throwErr,
            )
        )().subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done);
    });

    it("should pass through args", done => {
        emitNoResult(
            match(
                (a: string, b: number) => a.repeat(b),
                a => a,
                throwErr,
            )
        )("hi", 2).subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hihi");
        }, passErr, done);
    });

    it("should throw on Action", done => {
        emitNoResult(
            match(
                () => () => console.log("huh"),
                a => a,
                () => "hi",
            )
        )().subscribe(throwErr, () => done(), throwErr);
    });
});

describe("_if", () => {
    const falseyValues = [false, undefined, null, 0];
    const truthyValues = [true, 13, "hi", () => "hi", { dog: "dog" }];

    falseyValues.map(value => {
        it("should not emit on ${value} and no onFalse handler", done => {
            _if(
                () => value,
                throwErr,
            )().subscribe(throwErr, passErr, done);
        });

        it("should call onFalse on ${value}", done => {
            emitNoResult(
                _if(
                    () => value,
                    throwErr,
                    () => "hi",
                )
            )().subscribe(m => {
                expect(m).instanceof(Match);
                expect((m as Match<string>).value).equals("hi");
            }, passErr, done);
        });
    });

    it("should pass through arguments", done => {
        emitNoResult(
            _if(
                (a: number, b: number) => a > b,
                () => "hi",
                throwErr,
            )
        )(5, 2).subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done);
    });

    truthyValues.map(value => {
        it("should call onTrue handler on ${value}", done => {
            emitNoResult(
                _if(
                    () => value,
                    () => "hi",
                )
            )().subscribe(m => {
                expect(m).instanceof(Match);
                expect((m as Match<string>).value).equals("hi");
            }, passErr, done);
        });
    });
})