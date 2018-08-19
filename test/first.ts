import { describe, expect, passErr, throwErr } from './common';
import { first, Value, alwaysEmit, NoResult } from '../src/prague';

describe("first", () => {
    it("should not emit on no transforms", done => {
        first(
        )().subscribe(throwErr, passErr, done)
    });

    it("should not emit on undefined", done => {
        first(
            () => undefined
        )().subscribe(throwErr, passErr, done)
    });

    it("returns result of first transform when Value", done => {
        alwaysEmit(
            first(
                () => "hi"
            )
        )().subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done)
    });

    it("returns result of second transform when first is undefined", done => {
        alwaysEmit(
            first(
                () => undefined,
                () => "hi",
            )
        )().subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done)
    });

    it("ignores second transform when first is Match", done => {
        alwaysEmit(
            first(
                () => "hi",
                throwErr,
            )
        )().subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done)
    });

    it("passes through arguments to all functions", done => {
        alwaysEmit(
            first(
                (a: string, b: number) => undefined,
                (a, b) => a.repeat(b),
            )
        )("hi", 2).subscribe(m => {
            expect(m).instanceof(Value);
            expect((m as Value<string>).value).equals("hihi");
        }, passErr, done)
    });
});

