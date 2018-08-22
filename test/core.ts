import { describe, expect, passErr, throwErr, nullablevalues, values, isNull } from './common';
import { of, empty, from as observableFrom } from 'rxjs';
import { toObservable, Action, Value, from } from '../src/prague';
import { toArray } from 'rxjs/operators';

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

describe('Action', () => {
    it('should create an Action with supplied synchronous action', (done) => {
        let handled = false;
        let action = () => { handled = true; };
        let r = new Action(action);
        expect(r).instanceof(Action);
        r
            .action()
            .subscribe(() => {
                expect(handled).to.be.true;
            }, passErr, done);
    });

    it('should create an Action with supplied Promise action', (done) => {
        let handled = false;
        let action = () => {
            handled = true;
            return Promise.resolve();
        };
        let r = new Action(action);
        expect(r).instanceof(Action);
        r
            .action()
            .subscribe(() => {
                expect(handled).to.be.true;
            }, passErr, done);
    });

    it('should create an Action with supplied Observable action', (done) => {
        let handled = false;
        let action = () => {
            handled = true;
            return of();
        };
        let r = new Action(action);
        expect(r).instanceof(Action);
        r
            .action()
            .subscribe(() => {
                expect(handled).to.be.true;
            }, passErr, done);
    });

    it('should create an Action with score', () => {
        let handled = false;
        let action = () => { handled = true; };
        let r = new Action(action, .5);
        expect(r).instanceof(Action);
        expect(r.score).equals(.5);
    });
    
    it('should throw on an action with more than zero arguments', (done) => {
        let handled = false;
        let action = (a: boolean) => {
            handled = a;
            return of();
        };
        try {
            let r = new Action(action as any);
            throwErr();
        } catch (err) {
            done();
        }
    });
});

describe('Value', () => {
    it('should return a Value with the supplied value', () => {
        let result = new Value("hello");
        expect(result).instanceof(Value);
        expect(result.value).equals('hello');
    });

    it('should return a Value with the supplied value and score', () => {
        let result = new Value("hello", .5);
        expect(result).instanceof(Value);
        expect(result.value).equals('hello');
        expect(result.score).equals(.5);
    });
});

describe("Result.cloneWithScore", () => {
    it("should return itself with the same score", () => {
        let value = new Value("hello", .5);
        let m = value.cloneWithScore(.5);
        expect(m).equals(value);
        expect(m.score).equals(.5);
    });

    it("should return a new result with a different score", () => {
        let value = new Value("hello", .5);
        let m = value.cloneWithScore(.75);
        expect(m).instanceof(Value);
        expect(m.score).equals(.75);
        expect(m.value).equals("hello");
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
        ().subscribe(isNull, passErr, done);
    });

    it("should emit null on null", (done) => {
        from(null)
        ().subscribe(isNull, passErr, done)
    });

    it("should emit null on no args", (done) => {
        from()
        ().subscribe(isNull, passErr, done)
    });

    values.forEach(value => {
        it(`should return () => Observable.of(Value) for () => ${typeof value}`, (done) => {
            from(() => value)
            ().subscribe(r => {
                expect(r).instanceof(Value);
                expect((r as Value<any>).value).equals(value);
            }, passErr, done)
        });

        it(`should pass through () => Observable.of(Value<${typeof value}>) for () => Value<${typeof value}>`, (done) => {
            const m = new Value(value);

            from(() => m)
            ().subscribe(r => {
                expect(r).instanceof(Value);
                expect(r).equals(m);
            }, passErr, done)
        });

    });

    it("should return () => Observable.of(Action) for () => () =>  ...", (done) => {
        let handled = false;

        from(() => () => {
            handled = true;
        })
        ().subscribe(r => {
            expect(r).instanceof(Action);
            (r as Action)
                .action()
                .subscribe(() => {
                    expect(handled).to.be.true;
                })
        }, passErr, done)
    });

    it("should pass through () => Observable.of(Action) for () => Action ", (done) => {
        let handled = false;
        const action = new Action(() => {
            handled = true;
        });

        from(() => action)
        ().subscribe(r => {
            expect(r).instanceof(Action);
            expect(r).to.equal(action);
            (r as Action)
                .action()
                .subscribe(() => {
                    expect(handled).to.be.true;
                })
        }, passErr, done);
    });

    it("should pass through an argument", (done) => {
        let handled = false;

        from((a: boolean) => () => {
            handled = a;
        })
        (true).subscribe(r => {
            expect(r).instanceof(Action);
            (r as Action)
                .action()
                .subscribe(() => {
                    expect(handled).to.be.true;
                })
        }, passErr, done)
    });
});
