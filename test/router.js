"use strict";

const chai = require('chai');
const expect = chai.expect;
const { toObservable, toFilteredObservable, isRouter, simpleRouter, toRouter, routeMessage, first, best, run, tryMatch, matchAll, matchAny, prependMatcher, ifMatch, branchMatch, nullRouter, throwRoute, catchRoute } = require('../dist/prague.js');
const { Observable } = require('rxjs');

const foo = {
    foo: "foo"
}

const notFoo = {
    foo: "notFoo"
}

const bar = {
    bar: "bar"
}

const addBar = (m) => m.foo == "foo" && Object.assign({}, m, bar);

const fooPlusBar = {
    foo: "foo",
    bar: "bar"
}

const throwErr = () => {
    throw new Error();
}

const passErr = (err) => {
    throw err;
}

const noop = () => {}

describe('toObservable', () => {
    it("should convert a number to an observable", (done) => {
        toObservable(5)
            .subscribe(n => {
                expect(n).to.eql(5);
                done();
            });       
    });

    it("should convert a string to an observable", (done) => {
        toObservable("Prague")
            .subscribe(n => {
                expect(n).to.eql("Prague");
                done();
            });
    });

    it("should convert an array to an observable", (done) => {
        toObservable([1, 2, 3])
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
                done();
            });       
    });

    it("should convert a Promise<number> to an observable", (done) => {
        toObservable(Promise.resolve(5))
            .subscribe(n => {
                expect(n).to.eql(5);
                done();
            });       
    });

    it("should convert a Promise<string> to an observable", (done) => {
        toObservable(Promise.resolve("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
                done();
            });       
    });

    it("should convert a Promise<array> to an observable", (done) => {
        toObservable(Promise.resolve([1, 2, 3]))
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
                done();
            });       
    });

    it("should convert an Observable<number> to an observable", (done) => {
        toObservable(Observable.of(5))
            .subscribe(n => {
                expect(n).to.eql(5);
                done();
            });       
    });

    it("should convert an Observable<string> to an observable", (done) => {
        toObservable(Observable.of("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
                done();
            });       
    });

    it("should convert an Observable<array> to an observable", (done) => {
        toObservable(Observable.of([1, 2, 3]))
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
                done();
            });       
    });

    it("should convert null to an observable", (done) => {
        toObservable(null)
            .subscribe(n => {
                expect(n).to.eql(null);
                done();
            });       
    });

    it("should convert undefined to an observable", (done) => {
        toObservable(undefined)
            .subscribe(n => {
                expect(n).to.eql(undefined);
                done();
            });       
    });

    it("should convert Promise<null> to an observable", (done) => {
        toObservable(Promise.resolve(null))
            .subscribe(n => {
                expect(n).to.eql(null);
                done();
            });       
    });

    it("should convert Promise<undefined> to an observable", (done) => {
        toObservable(Promise.resolve(undefined))
            .subscribe(n => {
                expect(n).to.eql(undefined);
                done();
            });       
    });

    it("should convert Observable<null> to an observable", (done) => {
        toObservable(Observable.of(null))
            .subscribe(n => {
                expect(n).to.eql(null);
                done();
            });       
    });

    it("should convert Observable<undefined> to an observable", (done) => {
        toObservable(Observable.of(undefined))
            .subscribe(n => {
                expect(n).to.eql(undefined);
                done();
            });       
    });

    it("should complete and never emit on Observable.empty()", (done) => {
        toObservable(Observable.empty())
            .subscribe(throwErr, passErr, done);       
    });

});


describe('toFilteredObservable', () => {
    it("should convert a number to an observable", (done) => {
        toFilteredObservable(5)
            .subscribe(n => {
                expect(n).to.eql(5);
                done();
            });       
    });

    it("should convert a string to an observable", (done) => {
        toFilteredObservable("Prague")
            .subscribe(n => {
                expect(n).to.eql("Prague");
                done();
            });
    });

    it("should convert an array to an observable", (done) => {
        toFilteredObservable([1, 2, 3])
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
                done();
            });       
    });

    it("should convert a Promise<number> to an observable", (done) => {
        toFilteredObservable(Promise.resolve(5))
            .subscribe(n => {
                expect(n).to.eql(5);
                done();
            });       
    });

    it("should convert a Promise<string> to an observable", (done) => {
        toFilteredObservable(Promise.resolve("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
                done();
            });       
    });

    it("should convert a Promise<array> to an observable", (done) => {
        toFilteredObservable(Promise.resolve([1, 2, 3]))
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
                done();
            });       
    });

    it("should convert an Observable<number> to an observable", (done) => {
        toFilteredObservable(Observable.of(5))
            .subscribe(n => {
                expect(n).to.eql(5);
                done();
            });       
    });

    it("should convert an Observable<string> to an observable", (done) => {
        toFilteredObservable(Observable.of("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
                done();
            });       
    });

    it("should convert an Observable<array> to an observable", (done) => {
        toFilteredObservable(Observable.of([1, 2, 3]))
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
                done();
            });       
    });

    it("should complete and never emit on null", (done) => {
        toFilteredObservable(null)
            .subscribe(throwErr, passErr, done);       
    });

    it("should complete and never emit on undefined", (done) => {
        toFilteredObservable(undefined)
            .subscribe(throwErr, passErr, done);       
    });

    it("should complete and never emit on Promise<null>", (done) => {
        toFilteredObservable(Promise.resolve(null))
            .subscribe(throwErr, passErr, done);       
    });

    it("should complete and never emit on Promise<undefined>", (done) => {
        toFilteredObservable(Promise.resolve(undefined))
            .subscribe(throwErr, passErr, done);       
    });

    it("should complete and never emit on Observable<null>", (done) => {
        toFilteredObservable(Observable.of(null))
            .subscribe(throwErr, passErr, done);       
    });

    it("should complete and never emit on Observable<undefined>", (done) => {
        toFilteredObservable(Observable.of(undefined))
            .subscribe(throwErr, passErr, done);       
    });

    it("should complete and never emit on Observable.empty()", (done) => {
        toFilteredObservable(Observable.empty())
            .subscribe(throwErr, passErr, done);       
    });

});

describe('isRouter', () => {
    it('should return true for a router', () => {
        expect(isRouter(simpleRouter(m => true))).to.be.true;
    });

     it('should return false for a handler', () => {
        expect(isRouter(m => true)).to.be.false;
    });

})

const message = { text: "foo" }

describe('toRouter', () => {
    it('should convert a router to a router', (done) => {
        let foo = false;
        routeMessage(
            toRouter(simpleRouter(m => {
                foo = true;
            })),
            message
        )
            .subscribe(n => {
                expect(foo).to.be.true;
                done();
            });
    });

    it('should convert a handler to a router', (done) => {
        let foo = false;
        routeMessage(
            toRouter(m => {
                foo = true;
            }),
            message
        )
            .subscribe(n => {
                expect(foo).to.be.true;
                done();
            });
    });
})

// the above test routeMessage and simpleRouter

describe('first', () => {
    it('should complete and never emit on no routers', (done) =>
        routeMessage(
            first(),
            message
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on only null/undefined routers', (done) =>
        routeMessage(
            first(
                null,
                undefined
            ),
            message
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on only unsuccessful and null/undefined routers', (done) =>
        routeMessage(
            first(
                nullRouter(),
                null,
                undefined
            ),
            message
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on no successful routers', (done) => {
        routeMessage(
            first(
                nullRouter()
            ),
            message
        )
            .subscribe(throwErr, passErr, done)
    });

    it('should convert a handler to a router, and route to it', (done) => {
        let foo = false;
        routeMessage(
            first(
                m => {
                    foo = true;
                }
            ),
            message
        )
            .subscribe(n => {
                expect(foo).to.be.true;
                done();
            });
    });

    it('should route to a single successful router', (done) => {
        let foo = false;
        routeMessage(
            first(
                simpleRouter(m => {
                    foo = true;
                })
            ),
            message
        )
            .subscribe(n => {
                expect(foo).to.be.true;
                done();
            });
    });

    it('should ignore null/undefined routers and route to a successful router', (done) => {
        let foo = false;
        routeMessage(
            first(
                null,
                undefined,
                simpleRouter(m => {
                    foo = true;
                })
            ),
            message
        )
            .subscribe(n => {
                expect(foo).to.be.true;
                done();
            });
    });

    it('should skip an unsuccessful router and route to a successful router', (done) => {
        let foo = false;
        routeMessage(
            first(
                nullRouter(),
                simpleRouter(m => {
                    foo = true;
                })
            ),
            message
        )
            .subscribe(n => {
                expect(foo).to.be.true;
                done();
            });
    });

});

describe('run', () => {
    it("should execute the handler, complete, and never emit", (done) => {
        let foo = false;
        routeMessage(
            run(
                m => {
                    foo = true;
                }
            ),
            message
        )
            .subscribe(throwErr, passErr, _ => {
                expect(foo).to.be.true;
                done()
            })
    })
});

describe('tryMatch', () => {
    it('should complete and never emit on false predicate', (done) =>
        tryMatch(m => false, foo)
            .subscribe(throwErr, passErr, done)
    );

    it('should complete on true predicate', (done) => {
        tryMatch(m => true, foo)
            .subscribe(noop, noop, done);
    });

    it('should pass message through on true predicate', (done) => {
        tryMatch(m => true, foo).subscribe(n => {
            expect(n).to.eql(foo);
            done();
        });
    });
    
    it('should complete on match', (done) => {
        tryMatch(addBar, foo)
            .subscribe(noop, noop, done);
    });

    it('should pass result through on match', (done) => {
        tryMatch(addBar, foo).subscribe(n => {
            expect(n).to.eql(fooPlusBar);
            done();
        });
    });

    it('should complete and never emit on no match', (done) =>
        tryMatch(addBar, notFoo)
            .subscribe(throwErr, passErr, done)
    );
    
});

describe('matchAll', () => {
    it('should stop on false predicate', (done) =>
        tryMatch(matchAll(m => false), foo)
            .subscribe(throwErr, passErr, done)
    );

    it('should pass through true predicate', (done) => {
        tryMatch(matchAll(m => true), foo).subscribe(n => {
            expect(n).to.eql(foo);
            done();
        });
    });

    it('should pass through match', (done) => {
        tryMatch(matchAll(addBar), foo).subscribe(n => {
            expect(n).to.eql(fooPlusBar);
            done();
        });
    });

    it('should pass through no match', (done) => {
        tryMatch(addBar, notFoo)
            .subscribe(throwErr, passErr, done)
    });

    it('should stop on false predicate', (done) => {
        tryMatch(matchAll(m => false, addBar), foo)
            .subscribe(throwErr, passErr, done)
    });

    it('should pass through true predicate to match', (done) => {
        tryMatch(matchAll(m => true, addBar), foo).subscribe(n => {
            expect(n).to.eql(fooPlusBar);
            done();
        });
    });

    it('should pass through true predicate to no match, then stop', (done) => {
        tryMatch(matchAll(m => true, addBar), notFoo)
            .subscribe(throwErr, passErr, done)
    });

    it('should pass through match to true predicate', (done) => {
        tryMatch(matchAll(addBar, m => true), foo).subscribe(n => {
            expect(n).to.eql(fooPlusBar);
            done();
        });
    });

    it('should pass through match to false predicate, then stop', (done) => {
        tryMatch(matchAll(addBar, m => false), foo)
            .subscribe(throwErr, passErr, done)
    });

    it('should stop on no match', (done) => {
        tryMatch(matchAll(addBar, m => true), notFoo)
            .subscribe(throwErr, passErr, done)
    });

});

describe('matchAny', () => {
    it('should stop on false predicate', (done) =>
        tryMatch(matchAny(m => false), foo)
            .subscribe(throwErr, passErr, done)
    );

    it('should pass through true predicate', (done) => {
        tryMatch(matchAny(m => true), foo).subscribe(n => {
            expect(n).to.eql(foo);
            done();
        });
    });

    it('should stop on no match', (done) =>
        tryMatch(matchAny(addBar), notFoo)
            .subscribe(throwErr, passErr, done)
    );

    it('should pass through match', (done) => {
        tryMatch(matchAll(addBar), foo).subscribe(n => {
            expect(n).to.eql(fooPlusBar);
            done();
        });
    });

    it('should stop on false predicate, no match', (done) =>
        tryMatch(matchAny(m => false, addBar), notFoo)
            .subscribe(throwErr, passErr, done)
    );

    it('should stop on no match, false predicate', (done) =>
        tryMatch(matchAny(addBar, m => false), notFoo)
            .subscribe(throwErr, passErr, done)
    );

    it('should pass through true predicate, no match', (done) =>
        tryMatch(matchAny(m => true, addBar), notFoo).subscribe(n => {
            expect(n).to.eql(notFoo);
            done();
        })
    );

    it('should pass through true predicate, match', (done) =>
        tryMatch(matchAny(m => true, addBar), foo).subscribe(n => {
            expect(n).to.eql(foo);
            done();
        })
    );

    it('should stop on false predicate, no match', (done) =>
        tryMatch(matchAny(m => false, addBar), notFoo)
            .subscribe(throwErr, passErr, done)
    );

    it('should skip false predicate, pass through match', (done) =>
        tryMatch(matchAny(m => false, addBar), foo).subscribe(n => {
            expect(n).to.eql(fooPlusBar);
            done();
        })
    );

    it('should pass through match, false predicate', (done) =>
        tryMatch(matchAny(addBar, m => false), foo).subscribe(n => {
            expect(n).to.eql(fooPlusBar);
            done();
        })
    );

    it('should pass through match, true predicate', (done) =>
        tryMatch(matchAny(addBar, m => true), foo).subscribe(n => {
            expect(n).to.eql(fooPlusBar);
            done();
        })
    );
});
