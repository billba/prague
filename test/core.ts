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

    it("should emit null on no args", (done) => {
        from()
        ()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done)
    });

    [null, undefined].forEach(value => {
        it(`should emit null on ${value}`, (done) => {
            from(value)
            ()
            .pipe(defaultIfEmpty(13))
            .subscribe(isNull, passErr, done)
        });
    
        it(`should emit null on () => ${value}`, (done) => {
            from(() => value)
            ()
            .pipe(defaultIfEmpty(13))
            .subscribe(isNull, passErr, done)
        });
    })

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
        from((a: boolean) => a)
        (true).subscribe(r => {
            expect(r).is.true;
        }, passErr, done)
    });

    it("should pass through multiple arguments", (done) => {
        from((a: string, b: number) => a.repeat(b))
        ("hi", 2).subscribe(r => {
            expect(r).equals("hihi");
        }, passErr, done)
    });
});
