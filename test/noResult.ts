import { describe, expect, passErr, throwErr } from './common';
import { Value, NoResult, alwaysEmit } from '../src/prague';

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

describe("alwaysEmit", () => {
    it("should pass through result", done => {
        let emitted = false;
        const m = new Value("Hi");

        alwaysEmit(
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

        alwaysEmit(
            () => null
        )().subscribe(r => {
            emitted = true;
            expect(r).instanceof(NoResult);
        }, passErr, () => {
            expect(emitted).is.true;
            done();
        })
    });

    it("should emit NoResult with score on no result", done => {
        let emitted = false;

        alwaysEmit(
            () => null,
            .5
        )().subscribe(r => {
            emitted = true;
            expect(r).instanceof(NoResult);
            expect(r.score).equals(.5);
        }, passErr, () => {
            expect(emitted).is.true;
            done();
        })
    });
});