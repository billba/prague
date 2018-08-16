import { describe, expect, passErr, throwErr } from './common';
import { first, Match } from '../src/prague';

describe("first", () => {
    it("returns undefined on no transforms", done => {
        first(
        )().subscribe(m => {
            expect(m).is.undefined;
        }, passErr, done)
    });

    it("returns result of first transform when undefined", done => {
        first(
            () => undefined
        )().subscribe(m => {
            expect(m).is.undefined;
        }, passErr, done)
    });

    it("returns result of first transform when Match", done => {
        first(
            () => "hi"
        )().subscribe(m => {
            expect(m).instanceof(Match);
            expect(m.value).equals("hi");
        }, passErr, done)
    });

    it("returns result of second transform when first is undefined", done => {
        first(
            () => undefined,
            () => "hi",
        )().subscribe(m => {
            expect(m).instanceof(Match);
            expect(m.value).equals("hi");
        }, passErr, done)
    });

    it("ignores of second transform when first is Match", done => {
        first(
            () => "hi",
            throwErr,
        )().subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done)
    });

    it("passes through arguments to all functions", done => {
        first(
            (a: string, b: number) => undefined,
            (a, b) => a.repeat(b),
        )("hi", 2).subscribe(m => {
            expect(m).instanceof(Match);
            expect((m as Match<string>).value).equals("hihi");
        }, passErr, done)
    });
});

