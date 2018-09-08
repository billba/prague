import { expect, passErr, throwErr, isNull } from './common';
import { pipe, run, tap, transformInstance, combine, transformNull, doAction, Scored } from '../src/prague';
import { defaultIfEmpty } from 'rxjs/operators';

describe("pipe", () => {

    it('should emit null when first transform emits null', done => {
        pipe(
            () => undefined,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    it('should emit null and not call second transform when first transform emits null', done => {
        pipe(
            () => undefined,
            throwErr,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    it('should emit null when second transform emits null', done => {
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
            expect(m).equals("hi");
        }, passErr, done)
    });

    it('should pass through multiple arguments to first transform', done => {
        pipe(
            (a: string, b: number) => a.repeat(b),
        )("hi", 2).subscribe(m => {
            expect(m).equals("hihi");
        }, passErr, done)
    });

    it('should pass result of first transform to second transform', done => {
        pipe(
            (a: string, b: number) => a.repeat(b),
            a => a,
        )("hi", 2).subscribe(m => {
            expect(m).equals("hihi");
        }, passErr, done)
    });

    it('should pass result of second transform to third transform', done => {
        pipe(
            (a: string, b: number) => a.repeat(b),
            a => a,
            a => a,
        )("hi", 2).subscribe(m => {
            expect(m).equals("hihi");
        }, passErr, done)
    });

    it('should short circuit on second null', done => {
        pipe(
            (a: string, b: number) => a.repeat(b),
            a => null,
            throwErr,
        )("hi", 2)
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });
});

describe("tap", () => {
    it("should get the result of the previous function, and pass through to following function", done => {
        let handled = "no";

        pipe(
            (a: string, b: number) => a.repeat(b),
            tap(a => {
                handled = a;
            }),
            a => a,
        )("hi", 2).subscribe(m => {
            expect(handled).to.equal("hihi");
            expect(m).to.equal("hihi");
        }, passErr, done);
    });
});

describe("transformInstance", () => {
    it("should pass through results of other than the stated class", done => {
        pipe(
            () => "hi",
            transformInstance(Scored, throwErr),
        )().subscribe(m => {
            expect(m).equals("hi");
        }, passErr, done);
    });

    it("should transform results of the stated class", done => {
        pipe(
            () => Scored.from("hi"),
            transformInstance(Scored, () => "bye"),
        )().subscribe(m => {
            expect(m).equals("bye");
        }, passErr, done);
    });
});

describe("transformNull", () => {
    it("should pass through non-null values", done => {
        combine(
            () => "hi",
            transformNull(throwErr),
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(m => {
            expect(m).equals("hi");
        }, passErr, done);
    });

    it("should transform null", done => {
        combine(
            () => null,
            transformNull(() => "hi"),
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(m => {
            expect(m).equals("hi");
        }, passErr, done);
    });
});

describe("doAction", () => {
    it("should ignore non-function result", done => {
        pipe(
            (a: string, b: number) => a.repeat(b),
            doAction,
        )("hi", 2).subscribe(m => {
            expect(m).to.equal("hihi");
        }, passErr, done);
    });

    it("should do function", done => {
        let handled = "no";

        pipe(
            (a: string) => () => {
                handled = a;
            },
            doAction,
        )("hi").subscribe(m => {
            expect(handled).equals("hi");
            expect(typeof m).equals("function");
        }, passErr, done);
    });
});

describe("run", () => {
    it("should ignore non-action result", done => {
        run(
            (a: string, b: number) => a.repeat(b)
        )("hi", 2).subscribe(m => {
            expect(m).to.equal("hihi");
        }, passErr, done);
    });

    it("should do function", done => {
        let handled = "no";

        run(
            (a: string) => () => {
                handled = a;
            }
        )("hi").subscribe(m => {
            expect(handled).equals("hi");
            expect(typeof m).equals("function");
        }, passErr, done);
    });
});

describe("combine", () => {

    it('should emit null when first transform emits null', done => {
        combine(
            () => undefined,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    it('should emit null when second transform emits null', done => {
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
            expect(m).equals("hi");
        }, passErr, done)
    });

    it('should pass through multiple arguments to first transform', done => {
        combine(
            (a: string, b: number) => a.repeat(b),
        )("hi", 2).subscribe(m => {
            expect(m).equals("hihi");
        }, passErr, done)
    });

    it('should pass result of first transform to second transform', done => {
        combine(
            (a: string, b: number) => a.repeat(b),
            a => a,
        )("hi", 2).subscribe(m => {
            expect(m).equals("hihi");
        }, passErr, done)
    });
});