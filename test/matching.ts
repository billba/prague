import { describe, expect, passErr, throwErr } from './common';
import { match, Value, if as _if, alwaysEmit } from '../src/prague';

describe("match", () => {
    it("should not emit on no match and no onNoMatch handler", done => {
        match(
            () => undefined,
            throwErr,
        )().subscribe(throwErr, passErr, done);
    });

    it("should call onNoMatch handler on no match", done => {
        alwaysEmit(
            match(
                () => undefined,
                throwErr,
                () => "hi"
            )
        )().subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done);
    });

    it("should call onMatch handler on match", done => {
        alwaysEmit(
            match(
                () => "hi",
                a => a,
                throwErr,
            )
        )().subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done);
    });

    it("should pass through args", done => {
        alwaysEmit(
            match(
                (a: string, b: number) => a.repeat(b),
                a => a,
                throwErr,
            )
        )("hi", 2).subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hihi");
        }, passErr, done);
    });

    it("should throw on Action", done => {
        alwaysEmit(
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
            alwaysEmit(
                _if(
                    () => value,
                    throwErr,
                    () => "hi",
                )
            )().subscribe(m => {
                expect(m).instanceof(Value);
                expect((m as Value<string>).value).equals("hi");
            }, passErr, done);
        });
    });

    it("should pass through arguments", done => {
        alwaysEmit(
            _if(
                (a: number, b: number) => a > b,
                () => "hi",
                throwErr,
            )
        )(5, 2).subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done);
    });

    truthyValues.map(value => {
        it("should call onTrue handler on ${value}", done => {
            alwaysEmit(
                _if(
                    () => value,
                    () => "hi",
                )
            )().subscribe(m => {
                expect(m).instanceof(Value);
                expect((m as Value<string>).value).equals("hi");
            }, passErr, done);
        });
    });
})