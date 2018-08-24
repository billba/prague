import { describe, expect, passErr, throwErr, isNull } from './common';
import { pipe, run, Value, tap, Action, transformResult, combine, transformNull } from '../src/prague';
import { defaultIfEmpty } from 'rxjs/operators';

describe("pipe", () => {

    it('should emit null when first transform returns null', done => {
        pipe(
            () => undefined,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    it('should emit null and not call second transform when first transform returns null', done => {
        pipe(
            () => undefined,
            throwErr,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    it('should emit null when second transform returns null', done => {
        pipe(
            () => "hi",
            () => undefined,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    it('should pass through argument to first transform', done => {
        pipe(
            (a: string) => a,
        )("hi").subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done)
    });

    it('should pass through multiple arguments to first transform', done => {
        pipe(
            (a: string, b: number) => a.repeat(b),
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).equals("hihi");
        }, passErr, done)
    });

    it('should pass result of first transform to second transform', done => {
        pipe(
            (a: string, b: number) => a.repeat(b),
            a => a,
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).equals("hihi");
        }, passErr, done)
    });
});

describe("tap", () => {
    it("should get the result of the previous function, and pass through to following function", done => {
        let handled = "no";

        pipe(
            (a: string, b: number) => a.repeat(b),
            tap(a => {
                handled = a.value;
            }),
            a => a,
        )("hi", 2).subscribe(m => {
            expect(handled).to.equal("hihi");
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).to.equal("hihi");
        }, passErr, done);
    });
});

describe("transformResult", () => {
    it("should pass through results of other than the stated class", done => {
        const v = new Value("hi");

        pipe(
            () => v,
            transformResult(Action, throwErr),
        )().subscribe(m => {
            expect(m).equals(v);
        }, passErr, done);
    });

    it("should transform results of the stated class", done => {
        const v = new Value("hi");
        const v2 = new Value("bye");

        pipe(
            () => v,
            transformResult(Value, () => v2),
        )().subscribe(m => {
            expect(m).equals(v2);
        }, passErr, done);
    });
});

describe("transformNull", () => {
    it("should pass through non-null values", done => {
        const v = new Value("hi");

        combine(
            () => v,
            transformNull(throwErr),
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(m => {
            expect(m).equals(v);
        }, passErr, done);
    });

    it("should transform results of the stated class", done => {
        const v = new Value("hi");

        combine(
            () => null,
            transformNull(() => v),
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(m => {
            expect(m).equals(v);
        }, passErr, done);
    });
});

describe("run", () => {
    it("should ignore non-action result", done => {
        pipe(
            (a: string, b: number) => a.repeat(b),
            run,
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).to.equal("hihi");
        }, passErr, done);
    });

    it("should run action of Action", done => {
        let handled = "no";

        pipe(
            (a: string) => () => {
                handled = a;
            },
            run,
        )("hi").subscribe(m => {
            expect(handled).equals("hi");
            expect(m).instanceOf(Action);
        }, passErr, done);
    });
});

describe("combine", () => {

    it('should emit null when first transform returns null', done => {
        combine(
            () => undefined,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    it('should emit null when second transform returns null', done => {
        combine(
            () => "hi",
            () => undefined,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    it('should pass through argument to first transform', done => {
        combine(
            (a: string) => a,
        )("hi").subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).equals("hi");
        }, passErr, done)
    });

    it('should pass through multiple arguments to first transform', done => {
        combine(
            (a: string, b: number) => a.repeat(b),
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).equals("hihi");
        }, passErr, done)
    });

    it('should pass result of first transform to second transform', done => {
        combine(
            (a: string, b: number) => a.repeat(b),
            a => a,
        )("hi", 2).subscribe(m => {
            expect(m).instanceOf(Value);
            expect((m as Value<string>).value).equals("hihi");
        }, passErr, done)
    });
});