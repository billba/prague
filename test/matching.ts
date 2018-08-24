import { describe, expect, passErr, throwErr, isNull } from './common';
import { match, Value, matchIf } from '../src/prague';
import { defaultIfEmpty } from 'rxjs/operators';

describe("match", () => {
    it("should emit null on no value and no onNoValue handler", done => {
        match(
            () => undefined,
            throwErr,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done);
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

    it("should emit null and not call onNull on Value when onValue emits null", done => {
        match(
            () => "hi",
            () => undefined,
            throwErr,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done);
    });
});

describe("matchIf", () => {
    const falseyValues = [false, undefined, null, 0];
    const truthyValues = [true, 13, "hi", () => "hi", { dog: "dog" }];

    falseyValues.map(value => {
        it("should emit null on ${value} and no onFalsey handler", done => {
            matchIf(
                () => value,
                throwErr,
            )()
            .pipe(defaultIfEmpty(13))
            .subscribe(isNull, passErr, done);
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
        it("should call onTruthy handler on ${value}", done => {
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