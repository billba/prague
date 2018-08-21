import { describe, expect, passErr, throwErr, isNoResult } from './common';
import { match, Value, matchIf } from '../src/prague';

describe("match", () => {
    it("should emit NoResult on no value and no onNoValue handler", done => {
        match(
            () => undefined,
            throwErr,
        )().subscribe(isNoResult, passErr, done);
    });

    it("should call onNoValue handler on no value", done => {
        match(
            () => undefined,
            throwErr,
            () => "hi",
        )().subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done);
    });

    it("should call onValue handler on value", done => {
        match(
            () => "hi",
            a => a,
            throwErr,
        )().subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done);
    });

    it("should pass through args", done => {
        match(
            (a: string, b: number) => a.repeat(b),
            a => a,
            throwErr,
        )("hi", 2).subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hihi");
        }, passErr, done);
    });

    it("should throw on Action", done => {
        match(
            () => () => console.log("huh"),
            a => a,
            () => "hi",
        )().subscribe(throwErr, () => done(), throwErr);
    });

    it("should not call onNoValue on Value when onValue emits NoResult", done => {
        match(
            () => "hi",
            () => undefined,
            throwErr,
        )().subscribe(isNoResult, passErr, done);
    });
});

describe("matchIf", () => {
    const falseyValues = [false, undefined, null, 0];
    const truthyValues = [true, 13, "hi", () => "hi", { dog: "dog" }];

    falseyValues.map(value => {
        it("should emit NoResult on ${value} and no onFalse handler", done => {
            matchIf(
                () => value,
                throwErr,
            )().subscribe(isNoResult, passErr, done);
        });

        it("should call onFalse on ${value}", done => {
            matchIf(
                () => value,
                throwErr,
                () => "hi",
            )().subscribe(m => {
                expect(m).instanceof(Value);
                expect((m as Value<string>).value).equals("hi");
            }, passErr, done);
        });
    });

    it("should pass through arguments", done => {
        matchIf(
            (a: number, b: number) => a > b,
            () => "hi",
            throwErr,
        )(5, 2).subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done);
    });

    truthyValues.map(value => {
        it("should call onTrue handler on ${value}", done => {
            matchIf(
                () => value,
                () => "hi",
            )().subscribe(m => {
                expect(m).instanceof(Value);
                expect((m as Value<string>).value).equals("hi");
            }, passErr, done);
        });
    });
})