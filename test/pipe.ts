import { describe, expect, passErr, throwErr } from './common';
import { pipe, run, Match, tap, Action, emitNoResult } from '../src/prague';

describe("pipe", () => {

    it('should not emit first transform returns undefined', done => {
        pipe(
            () => undefined,
        )().subscribe(throwErr, passErr, done)
    });

    it('should not emit and not call second transform when first transform returns undefined', done => {
        pipe(
            () => undefined,
            throwErr,
        )().subscribe(throwErr, passErr, done)
    });

    it('should not emit when second transform returns undefined', done => {
        pipe(
            () => "hi",
            () => undefined,
        )().subscribe(throwErr, passErr, done)
    });

    it('should pass through argument to first transform', done => {
        emitNoResult(
            pipe(
                (a: string) => a,
            )
        )("hi").subscribe(m => {
            expect(m).instanceOf(Match);
            expect((m as Match<string>).value).equals("hi");
        }, passErr, done)
    });

    it('should pass through multiple arguments to first transform', done => {
        emitNoResult(
            pipe(
                (a: string, b: number) => a.repeat(b),
            )
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Match);
            expect((m as Match<string>).value).equals("hihi");
        }, passErr, done)
    });

    it('should pass result of first transform to second transform', done => {
        emitNoResult(
            pipe(
                (a: string, b: number) => a.repeat(b),
                a => a,
            )
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Match);
            expect((m as Match<string>).value).equals("hihi");
        }, passErr, done)
    });
});

describe("tap", () => {
    it("should get the result of the previous function, and pass through to following function", done => {
        let handled = "no";
        emitNoResult(
            pipe(
                (a: string, b: number) => a.repeat(b),
                tap(a => {
                    handled = a.value;
                }),
                a => a,
            )  
        )("hi", 2).subscribe(m => {
            expect(handled).to.equal("hihi");
            expect(m).instanceOf(Match);
            expect((m as Match<string>).value).to.equal("hihi");
        }, passErr, done);
    });
});

describe("run", () => {
    it("should ignore non-action result", done => {
        emitNoResult(
            pipe(
                (a: string, b: number) => a.repeat(b),
                run,
            )
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Match);
            expect((m as Match<string>).value).to.equal("hihi");
        }, passErr, done);
    });

    it("should run action of Action", done => {
        let handled = "no";

        emitNoResult(
            pipe(
                (a: string) => () => {
                    handled = a;
                },
                run,
            )
        )("hi").subscribe(m => {
            expect(handled).equals("hi");
            expect(m).instanceOf(Action);
        }, passErr, done);
    });
});