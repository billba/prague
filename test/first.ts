import { describe, expect, passErr, throwErr, isNull } from './common';
import { first, Value } from '../src/prague';
import { defaultIfEmpty } from 'rxjs/operators';

describe("first", () => {
    it("should emit null on no transforms", done => {
        first(
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done);
    });

    it("should emit null on undefined", done => {
        first(
            () => undefined
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    it("returns result of first transform when Value", done => {
        first(
            () => "hi"
        )().subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done)
    });

    it("returns result of second transform when first is undefined", done => {
        first(
            () => undefined,
            () => "hi",
        )().subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done)
    });

    it("ignores second transform when first is Match", done => {
        first(
            () => "hi",
            throwErr,
        )().subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done)
    });

    it("passes through arguments to all functions", done => {
        first(
            (a: string, b: number) => undefined,
            (a, b) => a.repeat(b),
        )("hi", 2).subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hihi");
        }, passErr, done)
    });
});

