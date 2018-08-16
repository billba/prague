import { describe, expect, passErr, throwErr, nullablevalues, values, } from './common';
import { of, empty, from as observableFrom } from 'rxjs';
import { toObservable, Action, Match, from} from '../src/prague';
import { toArray } from 'rxjs/operators';

describe("toObservable", () => {
    nullablevalues.map(value => {
        it(`should convert ${value} to an observable`, (done) => {
            toObservable(value)
                .subscribe(n => {
                    expect(n).to.eql(value);
                }, passErr, done);       
        });

        it(`should convert Promise<${value}> to an observable`, (done) => {
            toObservable(Promise.resolve(value))
                .subscribe(n => {
                    expect(n).to.eql(value);
                }, passErr, done);       
        });

        it(`should convert Observable<${value}> to an observable`, (done) => {
            toObservable(of(value))
                .subscribe(n => {
                    expect(n).to.eql(value);
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
                expect(n[0]).to.eql(1);
            }, passErr, done);       
    });
});

describe('Action', () => {
    it('should create an Action with supplied synchronous action', (done) => {
        let handled = false;
        let action = () => { handled = true; };
        let r = new Action(action);
        expect(r instanceof Action).to.be.true;
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
        expect(r instanceof Action).to.be.true;
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
        expect(r instanceof Action).to.be.true;
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
        expect(r instanceof Action).to.be.true;
        expect(r.score).to.eql(.5);
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

describe('Match', () => {
    it('should return a Match with the supplied value', () => {
        let result = new Match("hello");
        expect(result instanceof Match).to.be.true;
        expect(result.value).to.eql('hello');
    });

    it('should return a Match with the supplied value and score', () => {
        let result = new Match("hello", .5);
        expect(result instanceof Match).to.be.true;
        expect(result.value).to.eql('hello');
        expect(result.score).equals(.5);
    });
});

describe("Result.cloneWithScore", () => {
    it("should return itself with the same score", () => {
        let match = new Match("hello", .5);
        let m = match.cloneWithScore(.5);
        expect(m).to.eql(match);
        expect(m.score).to.eql(.5);
    });

    it("should return a new result with the supplied score", () => {
        let match = new Match("hello", .5);
        let m = match.cloneWithScore(.75);
        expect(m instanceof Match).to.be.true;
        expect(m.score).to.eql(.75);
        expect(m.value).to.eql("hello");
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

    it("should return () => Observable.of(undefined) for undefined", (done) => {
        from(undefined)()
            .subscribe(r => {
                expect(r).to.be.undefined;
            }, passErr, done)
    });

    it("should return () => Observable.of(undefined) for null", (done) => {
        from(null)()
            .subscribe(r => {
                expect(r).to.be.undefined;
            }, passErr, done)
    });

    it("should return () => Observable.of(undefined) for no args", (done) => {
        from()()
            .subscribe(r => {
                expect(r).to.be.undefined;
            }, passErr, done)
    });

    values.map(value => {
        it(`should return () => Observable.of(Match) for () => ${typeof value}`, (done) => {
            from(() => value)()
                .subscribe(r => {
                    expect(r instanceof Match).to.be.true;
                    expect(r.value).to.eql(value);
                }, passErr, done)
        });

        it(`should pass through () => Observable.of(Match<${typeof value}>) for () => Match<${typeof value}>`, (done) => {
            const m = new Match(value);
            from(() => m)()
                .subscribe(r => {
                    expect(r instanceof Match).to.be.true;
                    expect(r).to.eql(m);
                }, passErr, done)
        });

    });

    it("should return () => Observable.of(Action) for () => () =>  ...", (done) => {
        let handled = false;
        from(() => () => {
            handled = true;
        })()
            .subscribe(r => {
                expect(r instanceof Action).to.be.true;
                r
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
        from(() => action)()
            .subscribe(r => {
                expect(r instanceof Action).to.be.true;
                expect(r).to.equal(action);
                r
                    .action()
                    .subscribe(() => {
                        expect(handled).to.be.true;
                    })
            }, passErr, done)
    });

    it("should pass through an argument", (done) => {
        let handled = false;
        from((a: boolean) => () => {
            handled = a;
        })(true)
            .subscribe(r => {
                expect(r instanceof Action).to.be.true;
                r
                    .action()
                    .subscribe(() => {
                        expect(handled).to.be.true;
                    })
            }, passErr, done)
    });
});
