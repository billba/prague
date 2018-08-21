import { describe, expect, passErr, throwErr, isNoResult } from './common';
import { first, Value, NoResult } from '../src/prague';

describe("first", () => {
    it("should emit NoResult on no transforms", done => {
        first(
        )().subscribe(isNoResult, passErr, done);
    });

    it("should emit NoResult on undefined", done => {
        first(
            () => undefined
        )().subscribe(isNoResult, passErr, done)
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

