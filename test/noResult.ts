import { describe, expect, passErr, throwErr } from './common';
import { first, Match, NoResult, emitNoResult } from '../src/prague';

describe("NoResult", () => {
    it("should create a NoResult", () => {
        const r = new NoResult();
        expect(r).instanceof(NoResult);
    });

    it("should create a NoResult with score", () => {
        const r = new NoResult(.5);
        expect(r).instanceof(NoResult);
        expect(r.score).equals(.5);
    });
});

describe("emitNoResult", () => {
    it("should pass through result", done => {
        let emitted = false;
        const m = new Match("Hi");

        emitNoResult(
            () => m
        )().subscribe(r => {
            emitted = true;
            expect(r).equals(m);
        }, passErr, () => {
            expect(emitted).is.true;
            done();
        })
    });

    it("should emit NoResult on no result", done => {
        let emitted = false;

        emitNoResult(
            () => null
        )().subscribe(r => {
            emitted = true;
            expect(r).instanceof(NoResult);
        }, passErr, () => {
            expect(emitted).is.true;
            done();
        })
    });
});