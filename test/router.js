"use strict";

const chai = require('chai');
chai.use(require('chai-subset'));
const expect = chai.expect;
const { toObservable, toFilteredObservable, Router, first, best, run, toScore, routeWithCombinedScore, ifTrue, ifMatches, throwRoute, catchRoute, before, after } = require('../dist/prague.js');
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

describe('Router.null', () => {
    it('should not route', (done) => {
        Router.null
            .getRoute(foo)
            .subscribe(throwErr, passErr, done);
    });
})

describe('(test code) testRouter', () => {
    it('should route', (done) => {
        let routed;

        const testRouter = new Router(m => Observable.of({
            action: () => { routed = true; }
        }));

        testRouter
            .getRoute(foo)
            .flatMap(route => toObservable(route.action()))
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });
});

describe('Router.route', () => {
    it("should complete and never commit on Router.null", (done) => {
        Router.null
            .route(foo)
            .subscribe(throwErr, passErr, done);
    });

    it("should route to testRouter", (done) => {
        let routed;

        const testRouter = new Router(m => Observable.of({
            action: () => { routed = true; }
        }));

        testRouter
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });
});

describe('Router.fromHandler', () => {
    it("should convert a handler to a router", (done) => {
        let routed;

        Router.fromHandler(m => {
            routed = true;
        })
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });
});

describe('Router.from', () => {
    it('should convert a router to a router', (done) => {
        let routed;

        Router.from(Router.fromHandler(m => {
            routed = true;
        }))
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should convert a handler to a router', (done) => {
        let routed;

        Router.from(m => {
            routed = true;
        })
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });
})

describe('first', () => {
    it('should complete and never emit on no routers', (done) =>
        first()
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on only null/undefined routers', (done) =>
        first(
            null,
            undefined
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on only unsuccessful and null/undefined routers', (done) =>
        first(
            Router.null,
            null,
            undefined
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on no successful routers', (done) => {
        first(
            Router.null
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    });

    it('should convert a handler to a router, and route to it', (done) => {
        let routed;

        first(
            m => {
                routed = true;
            }
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should route to a single successful router', (done) => {
        let routed;

        first(
            Router.fromHandler(m => {
                routed = true;
            })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should ignore null/undefined routers and route to a successful router', (done) => {
        let routed;

        first(
            null,
            undefined,
            Router.fromHandler(m => {
                routed = true;
            })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should skip an unsuccessful router and route to a successful router', (done) => {
        let routed;

        first(
            Router.null,
            Router.fromHandler(m => {
                routed = true;
            })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

});

const makeRouter = (score, action) => new Router(m => Observable.of({
    score,
    action
}));

describe('best', () => {
    it('should complete and never emit on no routers', (done) =>
        best()
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on only null/undefined routers', (done) =>
        best(
            null,
            undefined
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on only unsuccessful and null/undefined routers', (done) =>
        best(
            Router.null,
            null,
            undefined
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on no successful routers', (done) => {
        best(
            Router.null
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    });

    it('should convert a handler to a router, and route to it', (done) => {
        let routed;

        best(
            m => {
                routed = true;
            }
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should route to a single successful scoreless router', (done) => {
        let routed;

        best(
            Router.fromHandler(m => {
                routed = true;
            })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should ignore null/undefined routers and route to a successful scoreless router', (done) => {
        let routed;

        best(
            null,
            undefined,
            Router.fromHandler(m => {
                routed = true;
            })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should skip an unsuccessful router and route to a successful scoreless router', (done) => {
        let routed;

        best(
            Router.null,
            Router.fromHandler(m => {
                routed = true;
            })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should return the first route where score=1, never trying the rest', (done) => {
        let routed;

        best(
            m => {
                routed = true;
            },
            throwErr
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should return the higher scoring route when it is first', (done) => {
        let routed;

        best(
            makeRouter(0.75, _ => { routed = 'first'; }),
            makeRouter(0.50, _ => { routed = 'second'; })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.eql('first');
                done();
            });
    });

    it('should return the higher scoring route when it is second', (done) => {
        let routed;

        best(
            makeRouter(0.50, _ => { routed = 'first'; }),
            makeRouter(0.75, _ => { routed = 'second'; })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.eql('second');
                done();
            });
    });

    it('should treat missing scores as 1', (done) => {
        let routed;

        best(
            makeRouter(undefined, _ => { routed = 'first'; }),
            makeRouter(0.75, _ => { routed = 'second'; })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.eql('first');
                done();
            });
    });

    it('should return the first of two tied scores', (done) => {
        let routed;

        best(
            makeRouter(0.75, _ => { routed = 'first'; }),
            makeRouter(0.75, _ => { routed = 'second'; })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.eql('first');
                done();
            });
    });
});


describe('run', () => {
    it("should execute the handler, complete, and never emit", (done) => {
        let routed;

        run(
            m => {
                routed = true;
            }
        )
            .route(foo)
            .subscribe(throwErr, passErr, _ => {
                expect(routed).to.be.true;
                done()
            })
    })
});

describe('routeWithCombinedScore', () => {
    it("should return score=1 with both scores undefined", () => {
        expect(toScore(routeWithCombinedScore(
            {
                action: () => {}
            }
        ).score)).to.eql(1);
    });

    it("should return supplied score when route score undefined", () => {
        expect(toScore(routeWithCombinedScore(
            {
                action: () => {}
            },
            .13
        ).score)).to.eql(.13);
    });

    it("should return route score when supplied score undefined", () => {
        expect(toScore(routeWithCombinedScore(
            {
                score: .13,
                action: () => {}
            }
        ).score)).to.eql(.13);
    });

    it("should return combined score when both scores supplied", () => {
        expect(toScore(routeWithCombinedScore(
            {
                score: .4,
                action: () => {}
            },
            .25
        ).score)).to.eql(.1);
    });
})

describe('ifTrue', () => {
    it("should complete and never emit on false when 'else' router doesn't exist", (done) =>
        ifTrue(
            m => false,
            throwErr
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it("should complete and never emit on true when 'else' router doesn't route", (done) =>
        ifTrue(
            m => false,
            throwErr,
            Router.null
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it("should complete and never emit on true when 'if' router doesn't route and 'else' router doesn't exist", (done) =>
        ifTrue(
            m => true,
            Router.null
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it("should complete and never emit on true when 'if' router doesn't route and 'else' router exists", (done) =>
        ifTrue(
            m => true,
            Router.null,
            throwErr
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it("should route message to 'if' handler on true predicate when 'else' router doesn't exist", (done) => {
        let routed;

        ifTrue(
            m => true,
            m => {
                routed = true;
            }
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should route message to 'if' handler on true predicate when 'else' router exists", (done) => {
        let routed;

        ifTrue(
            m => true,
            m => {
                routed = true;
            },
            throwErr
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should route message to 'if' router on true predicate when 'else' router doesn't exist", (done) => {
        let routed;

        ifTrue(
            m => true,
            Router.fromHandler(m => {
                routed = true;
            })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should route message to 'if' router on true predicate when 'else' router exists", (done) => {
        let routed;

        ifTrue(
            m => true,
            Router.fromHandler(m => {
                routed = true;
            }),
            throwErr
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should route message to 'else' handler on false predicate", (done) => {
        let routed;

        ifTrue(
            m => false,
            throwErr,
            m => {
                routed = true;
            }
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should route message to 'else' router on false predicate", (done) => {
        let routed;

        ifTrue(
            m => false,
            throwErr,
            Router.fromHandler(m => {
                routed = true;
            })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should return score=1 on true predicate when 'if' score undefined", (done) => {
        ifTrue(
            m => true,
            m => {}
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(toScore(route.score)).to.eql(1);
                done();
            })
    });

    it("should return route score on true predicate", (done) => {
        ifTrue(
            m => true,
            makeRouter(0.25, () => {})
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(toScore(route.score)).to.eql(.25);
                done();
            })
    });

    it("should return score=1 on false predicate when 'else' score undefined", (done) => {
        ifTrue(
            m => false,
            m => {},
            m => {}
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(toScore(route.score)).to.eql(1);
                done();
            })
    });

    it("should return 'else' route score on false predicate", (done) => {
        ifTrue(
            m => false,
            throwErr,
            makeRouter(0.5, () => {})
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(toScore(route.score)).to.eql(.5);
                done();
            })
    });

});
    
describe('ifMatches', () => {
    it("should complete and never emit on no match when 'else' router doesn't exist", (done) =>
        ifMatches(
            addBar,
            throwErr
        )
            .route(notFoo)
            .subscribe(throwErr, passErr, done)
    );

    it("should complete and never emit on no match when 'else' router doesn't route", (done) =>
        ifMatches(
            addBar,
            throwErr,
            Router.null
        )
            .route(notFoo)
            .subscribe(throwErr, passErr, done)
    );

    it("should complete and never emit on match when 'if' router doesn't route and 'else' router doesn't exist", (done) =>
        ifMatches(
            addBar,
            Router.null
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );


    it("should complete and never emit on match when 'if' router doesn't route and 'else' router exists", (done) =>
        ifMatches(
            addBar,
            Router.null,
            throwErr
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    );

    it("should route message to 'if' handler on match when 'else' router doesn't exist", (done) => {
        let routed;

        ifMatches(
            addBar,
            m => {
                routed = true;
            }
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should route message to 'if' handler on match when 'else' router exists", (done) => {
        let routed;

        ifMatches(
            addBar,
            m => {
                routed = true;
            },
            throwErr
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should route message to 'if' router on match when 'else' router doesn't exist", (done) => {
        let routed;

        ifMatches(
            addBar,
            Router.fromHandler(m => {
                routed = true;
            })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should route message to 'if' router on match when 'else' router exists", (done) => {
        let routed;

        ifMatches(
            addBar,
            Router.fromHandler(m => {
                routed = true;
            }),
            throwErr
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should route message to 'else' handler on no match", (done) => {
        let routed;

        ifMatches(
            addBar,
            throwErr,
            m => {
                routed = true;
            }
        )
            .route(notFoo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should route message to 'else' router on no match", (done) => {
        let routed;

        ifMatches(
            addBar,
            throwErr,
            Router.fromHandler(m => {
                routed = true;
            })
        )
            .route(notFoo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should return score=1 on scoreless match when 'if' score undefined", (done) => {
        ifMatches(
            m => ({}),
            m => {}
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(toScore(route.score)).to.eql(1);
                done();
            })
    });

    it("should return supplied score when 'if' score undefined", (done) => {
        ifMatches(
            m => ({
                score: 0.4  
            }),
            () => {}
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(toScore(route.score)).to.eql(.4);
                done();
            })
    });

    it("should return route score on scoreless match", (done) => {
        ifMatches(
            m => ({}),
            makeRouter(0.25, () => {})
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(toScore(route.score)).to.eql(.25);
                done();
            })
    });
    
    it("should return combined score when both scores supplied", (done) => {
        ifMatches(
            m => ({
                score: 0.4  
            }),
            makeRouter(0.25, () => {})
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(toScore(route.score)).to.eql(.1);
                done();
            })
    });

    it("should return score=1 on scoreless match when 'else' score undefined", (done) => {
        ifMatches(
            m => ({}),
            m => {},
            m => {}
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(toScore(route.score)).to.eql(1);
                done();
            })
    });

    it("should return 'else' route score on no match", (done) => {
        ifMatches(
            addBar,
            throwErr,
            makeRouter(0.5, () => {})
        )
            .getRoute(notFoo)
            .subscribe(route => {
                expect(toScore(route.score)).to.eql(.5);
                done();
            })
    });
});

describe('throwRoute', () => {
    it("should throw a route with thrown === true", (done) => {
        throwRoute()
            .getRoute(foo)
            .subscribe(route => {
                expect(route.thrown).to.be.true;
                done();
            });
    });
});

describe('catchRoute', () => {
    it("should pass through the route from a handler", (done) => {
        let routed;

        catchRoute(m => {
            routed = true;
        })
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it("should pass through the route from a non-throwing router", (done) => {
        let routed;

        catchRoute(Router.fromHandler(m => {
            routed = true;
        }))
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it("should complete and never emit with a thrown route", (done) => {
        let routed;

        catchRoute(throwRoute())
            .route(foo)
            .subscribe(throwErr, passErr, done);
    });
});

describe("before", () => {
    it("should complete and never emit with null router", (done) => {
        before(
            throwErr,
            Router.null
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    });

    it("should run 'before' handler and then router's action when handler is supplied", (done) => {
        let handled;
        let routed;
    
        before(
            m => {
                handled = true;
            },
            m => {
                expect(handled).to.be.true;
                routed = true;
            }
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it("should run 'before' handler and then router's action when router is supplied", (done) => {
        let handled;
        let routed;
    
        before(
            m => {
                handled = true;
            },
            Router.fromHandler(m => {
                expect(handled).to.be.true;
                routed = true;
            })
        )
            .route(foo)
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

});


describe("after", () => {
    it("should complete and never emit with null router", (done) => {
        after(
            Router.null,
            throwErr
        )
            .route(foo)
            .subscribe(throwErr, passErr, done)
    });

    it("should run router's action and then 'after' handler when handler is supplied", (done) => {
        let handled;
        let routed;
    
        after(
            m => {
                routed = true;
            },
            m => {
                expect(routed).to.be.true;
                handled = true;
            }
        )
            .route(foo)
            .subscribe(n => {
                expect(handled).to.be.true;
                done();
            });
    });

    it("should run router's action and then 'after' router when router is supplied", (done) => {
        let handled;
        let routed;
    
        after(
            Router.fromHandler(m => {
                routed = true;
            }),
            m => {
                expect(routed).to.be.true;
                handled = true;
            }
        )
            .route(foo)
            .subscribe(n => {
                expect(handled).to.be.true;
                done();
            });
    });

});