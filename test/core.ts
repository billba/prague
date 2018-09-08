import { expect, passErr, throwErr, nullablevalues, values, isNull } from './common';
import { of, empty, from as observableFrom, of as observableOf } from 'rxjs';
import { toObservable, from } from '../src/prague';
import { toArray, defaultIfEmpty } from 'rxjs/operators';

describe("toObservable", () => {
    nullablevalues.forEach(value => {
        it(`should convert ${value} to an observable`, (done) => {
            toObservable(value)
                .subscribe(n => {
                    expect(n).equals(value);
                }, passErr, done);       
        });

        it(`should convert Promise<${value}> to an observable`, (done) => {
            toObservable(Promise.resolve(value))
                .subscribe(n => {
                    expect(n).equals(value);
                }, passErr, done);       
        });

        it(`should convert Observable<${value}> to an observable`, (done) => {
            toObservable(of(value))
                .subscribe(n => {
                    expect(n).equals(value);
                }, passErr, done);       
        });

    });

    it("should complete and never emit on Observable.empty()", (done) => {
        toObservable(empty())
            .subscribe(throwErr, passErr, done);       
    });

    it("should return the first element of an observable", (done) => {
        toObservable(observableFrom([1,2,3])).pipe(
            toArray()
        )
            .subscribe(n => {
                expect(n.length === 1)
                expect(n[0]).equals(1);
            }, passErr, done);       
    });
});

describe("from", () => {
    it("should throw on non-functions", (done) => {
        try {
            const t = from("hi" as any);
        } catch(err) {
            done();
        }
    });

    it("should emit null on undefined", (done) => {
        from(undefined)
        ()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done);
    });

    it("should emit null on null", (done) => {
        from(null)
        ()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    it("should emit null on no args", (done) => {
        from()
        ()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    values.forEach(value => {
        it(`should return () => Observable.of(value) for () => ${value}`, (done) => {
            from(() => value)
            ().subscribe(r => {
                expect(r).equals(value);
            }, passErr, done)
        });

        it(`should return () => Observable.of(value) for () => Promise.resolve(${value})`, (done) => {
            from(() => Promise.resolve(value))
            ().subscribe(r => {
                expect(r).equals(value);
            }, passErr, done)
        });

        it(`should return () => Observable.of(value) for () => Observable.of(${value})`, (done) => {
            from(() => observableOf(value))
            ().subscribe(r => {
                expect(r).equals(value);
            }, passErr, done)
        });

    });

    it("should pass through an argument", (done) => {
        let handled = false;

        from((a: boolean) => () => {
            handled = a;
        })
        (true).subscribe(r => {
            expect(typeof r).is("function");
            (r as Action)
                .action()
                .subscribe(() => {
                    expect(handled).to.be.true;
                })
        }, passErr, done)
    });
});
