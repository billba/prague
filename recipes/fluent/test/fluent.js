"use strict";

const chai = require('chai');
chai.use(require('chai-subset'));
const expect = chai.expect;
const p = require('../dist/fluent.js');
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

const barIfFoo = (m) => m.foo == "foo" && bar;

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

describe('p.toObservable', () => {
    it("should convert a number to an observable", (done) => {
        p.toObservable(5)
            .subscribe(n => {
                expect(n).to.eql(5);
            }, passErr, done);       
    });

    it("should convert a string to an observable", (done) => {
        p.toObservable("Prague")
            .subscribe(n => {
                expect(n).to.eql("Prague");
            }, passErr, done);
    });

    it("should convert an array to an observable", (done) => {
        p.toObservable([1, 2, 3])
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
            }, passErr, done);       
    });

    it("should convert a Promise<number> to an observable", (done) => {
        p.toObservable(Promise.resolve(5))
            .subscribe(n => {
                expect(n).to.eql(5);
            }, passErr, done);       
    });

    it("should convert a Promise<string> to an observable", (done) => {
        p.toObservable(Promise.resolve("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
            }, passErr, done);       
    });

    it("should convert a Promise<array> to an observable", (done) => {
        p.toObservable(Promise.resolve([1, 2, 3]))
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
            }, passErr, done);       
    });

    it("should convert an Observable<number> to an observable", (done) => {
        p.toObservable(Observable.of(5))
            .subscribe(n => {
                expect(n).to.eql(5);
            }, passErr, done);       
    });

    it("should convert an Observable<string> to an observable", (done) => {
        p.toObservable(Observable.of("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
            }, passErr, done);       
    });

    it("should convert an Observable<array> to an observable", (done) => {
        p.toObservable(Observable.of([1, 2, 3]))
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
            }, passErr, done);       
    });

    it("should convert null to an observable", (done) => {
        p.toObservable(null)
            .subscribe(n => {
                expect(n).to.eql(null);
            }, passErr, done);       
    });

    it("should convert undefined to an observable", (done) => {
        p.toObservable(undefined)
            .subscribe(n => {
                expect(n).to.eql(undefined);
            }, passErr, done);       
    });

    it("should convert Promise<null> to an observable", (done) => {
        p.toObservable(Promise.resolve(null))
            .subscribe(n => {
                expect(n).to.eql(null);
            }, passErr, done);       
    });

    it("should convert Promise<undefined> to an observable", (done) => {
        p.toObservable(Promise.resolve(undefined))
            .subscribe(n => {
                expect(n).to.eql(undefined);
            }, passErr, done);       
    });

    it("should convert Observable<null> to an observable", (done) => {
        p.toObservable(Observable.of(null))
            .subscribe(n => {
                expect(n).to.eql(null);
            }, passErr, done);       
    });

    it("should convert Observable<undefined> to an observable", (done) => {
        p.toObservable(Observable.of(undefined))
            .subscribe(n => {
                expect(n).to.eql(undefined);
            }, passErr, done);       
    });

    it("should complete and never emit on Observable.empty()", (done) => {
        p.toObservable(Observable.empty())
            .subscribe(throwErr, passErr, done);       
    });
});

describe('new p.DoRoute', () => {
    it('should create a DoRoute with supplied action and no score', () => {
        let action = () => {};
        let route = new p.DoRoute(action);
        expect(route instanceof p.DoRoute).to.be.true;
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(1);
    });

    it('should create a DoRoute with supplied action and score', () => {
        let action = () => {};
        let route = new p.DoRoute(action, 0.5);
        expect(route instanceof p.DoRoute).to.be.true;
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(.5);
        expect(route.reason).to.be.undefined;
    });
});

describe('p.NoRoute', () => {
    it('should create a NoRoute with default reason', () => {
        let route = new p.NoRoute();

        expect(route instanceof p.NoRoute).to.be.true;
        expect(route.reason).to.eql('none');
        expect(route.action).to.be.undefined;
        expect(route.score).to.be.undefined;
    });

    it('should create a NoRoute with supplied reason', () => {
        let route = new p.NoRoute('reason');

        expect(route instanceof p.NoRoute).to.be.true;
        expect(route.reason).to.eql('reason');
        expect(route.action).to.be.undefined;
        expect(route.score).to.be.undefined;
    });
});

describe('p.do', () => {
    it('should return a function returning doRoute using supplied action and no score', (done) => {
        let handled;
        let route = p
            .do(m => { handled = m; })
            .getRoute$(foo)
            .subscribe(route => {
                expect(route instanceof p.DoRoute).to.be.true;
                expect(route.score).to.eql(1);
                route.action();
                expect(handled).to.eql(foo);
            }, passErr, done);
    });

    it('should return a function returning doRoute using supplied action and score', (done) => {
        let handled;
        let route = p
            .do(m => { handled = m; }, .5)
            .getRoute$(foo)
            .subscribe(route => {
                expect(route instanceof p.DoRoute).to.be.true;
                expect(route.score).to.eql(.5);
                route.action();
                expect(handled).to.eql(foo);
            }, passErr, done);
    });
});

describe('p.no', () => {
    it('should return a NoRoute with the default reason', (done) => {
        let route = p
            .no()
            .getRoute$(foo)
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql('none');
            }, passErr, done);
    });

    it('should return a NoRoute with the supplied reason', (done) => {
        let route = p
            .no('reason')
            .getRoute$(foo)
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql('reason');
            }, passErr, done);
    });
});

describe('new Router', () => {
    it('should create a Router returning NoRoute when no router supplied', done => {
        new p.Router()
            .getRoute$()
            .subscribe(route => {
                expect(p.NoRoute.is(route)).to.be.true;
            }, passErr, done);
    });

    it('should copy the getRoute$ from a Router', () => {
        let handled;
        let router = p.do(() => { handled = true; });
        let r = new p.Router(router);
        expect(r.getRoute$).to.eql(router.getRoute$);
    });

    it('should create a Router from a GetRoute', (done) => {
        let handled;
        let router = () => new p.DoRoute(() => { handled = true; });
        let r = new p.Router(router);
        
        expect(r).not.to.eql(router);
        r
            .getRoute$()
            .subscribe(route => {
                expect(p.DoRoute.is(route)).to.be.true;
                route.action();
                expect(handled).to.be.true;
            }, passErr, done)
    });

    it('should throw on non-Router, non-function', () => {
        expect(() => new p.Router("hello")).throws;
    });

    it('should create a Router from arg => Router', (done) => {
        let handled;
        let router = (arg) => p.do(() => { handled = arg; });
        new p.Router(router)
            .getRoute$(foo)
            .subscribe(route => {
                expect(p.DoRoute.is(route)).to.be.true;
                route.action();
                expect(handled).to.eql(foo);
            }, passErr, done)
    });

    it('should create a Router returning MatchRoute from arg => value', (done) => {
        let handled;
        let router = (arg) => "hi";
        new p.Router(router)
            .getRoute$(foo)
            .subscribe(route => {
                expect(p.MatchRoute.is(route)).to.be.true;
                expect(route.value).to.eql("hi");
            }, passErr, done)
    });

    it('should create a Router returning NoRoute from arg => undefined', (done) => {
        let handled;
        let router = (arg) => {};
        new p.Router(router)
            .getRoute$(foo)
            .subscribe(route => {
                expect(p.NoRoute.is(route)).to.be.true;
            }, passErr, done)
    });
});

describe('Router.from', () => {
    it('should return the supplied Router', () => {
        let router = p.Router.from(p.do(() => {}));
        expect(p.Router.from(router)).to.eql(router);
    });

    it('should pass through non-Routers', (done) => {
        let handled;
        let router = () => new p.DoRoute(() => { handled = true; });
        let r = p.Router.from(router);
        
        expect(r).not.to.eql(router);
        r
            .getRoute$()
            .subscribe(route => {
                expect(p.DoRoute.is(route)).to.be.true;
                route.action();
                expect(handled).to.be.true;
            }, passErr, done)
    });

});

describe('router.route$', () => {
    it("should return false on NoRoute with no arg", (done) => {
        p
            .no()
            .route$()
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done);
    });

    it("should return false on NoRoute with arg", (done) => {
        p
            .no()
            .route$(foo)
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done);
    });

    it("should return true on DoRoute with no arg", (done) => {
        let routed;

        p
            .do(() => {
                routed = true;
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should return true on DoRoute with arg", (done) => {
        let routed;

        p
            .do(() => {
                routed = true;
            })
            .route$(foo)
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should return true on DoRoute, passing arg to action", (done) => {
        let routed;

        p
            .do(m => {
                routed = m;
            })
            .route$(foo)
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.eql(foo);
            }, passErr, done);
    });
});

describe('p.first', () => {
    it('should return false on no routers', (done) =>
        p
            .first()
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only null/undefined routers', (done) =>
        p
            .first(
                null,
                undefined
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only unsuccessful and null/undefined routers', (done) =>
        p
            .first(
                p.no(),
                null,
                undefined
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on no successful routers', (done) => {
        p
            .first(
                p.no()
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    });

    it('should route to a single successful router', (done) => {
        let routed;

        p
            .first(
                p.do(m => {
                    routed = true;
                })
            )
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should ignore null/undefined routers and route to a successful router', (done) => {
        let routed;

        p
            .first(
                null,
                undefined,
                p.do(m => {
                    routed = true;
                })
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should skip an unsuccessful router and route to a successful router', (done) => {
        let routed;

        p
            .first(
                p.no(),
                p.do(m => {
                    routed = true;
                })
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe('p.ScoredRoute.combinedScore', () => {
    it("should return combined score", () => {
        expect(p.ScoredRoute.combinedScore(.4, .25)).to.eql(.1);
    });
})

describe('p.doScore.clone', () => {
    it("should return original route when supplied score matches route score", () => {
        let action = () => {}
        let original = new p.DoRoute(action, .4);
        let route = original.clone(.4);

        expect(route instanceof p.DoRoute).to.be.true;
        expect(route).to.eql(original);
    });

    it("should return route with supplied score", () => {
        let action = () => {}
        let original = new p.DoRoute(action, .4);
        let route = original.clone(.25);

        expect(route instanceof p.DoRoute).to.be.true;
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(.25);
    });
});

describe('p.doScore.cloneWithCombinedScore', () => {
    it("should return original route when score to be combined is 1", () => {
        let action = () => {}
        let original = new p.DoRoute(action, .4);
        let route = original.cloneWithCombinedScore();

        expect(route instanceof p.DoRoute).to.be.true;        
        expect(route).to.eql(original);
    });

    it("should return new route when score to be combined is not 1", () => {
        let action = () => {}
        let original = new p.DoRoute(action, .4);
        let route = original.cloneWithCombinedScore(.25);

        expect(route instanceof p.DoRoute).to.be.true;
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(.1);
    });
})

describe('p.best', () => {
    it('should return NoRoute on no routers', (done) => {
        p
            .best()
            .route$()
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done)
    });

    it('should return NoRoute on only null/undefined routers', (done) =>
        p
            .best(
                null,
                undefined
            )
            .route$()            
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return NoRoute on only unsuccessful and null/undefined routers', (done) =>
        p
            .best(
                p.no(),
                null,
                undefined
            )
            .route$()            
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return NoRoute on no successful routers', (done) => {
        p
            .best(
                p.no()
            )
            .route$()        
            .subscribe(t => expect(t).to.be.false, passErr, done)
    });

    it('should route to a single successful scoreless router', (done) => {
        let routed;

        p
            .best(
                p.do(m => {
                    routed = true;
                })
            )
            .route$()            
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should ignore null/undefined routers and route to a successful scoreless router', (done) => {
        let routed;

        p
            .best(
                null,
                undefined,
                p.do(m => {
                    routed = true;
                })
            )
            .route$()            
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should skip an unsuccessful router and route to a successful scoreless router', (done) => {
        let routed;

        p
            .best(
                p.no(),
                p.do(m => {
                    routed = true;
                })
            )
            .route$()            
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should return the first route where score=1, never trying the rest', (done) => {
        let routed;

        p
            .best(
                p.do(m => {
                    routed = true;
                }),
                throwErr
            )
            .route$()            
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should return the higher scoring route when it is first', (done) => {
        let routed;

        p
            .best(
                p.do(_ => { routed = 'first'; }, 0.75),
                p.do(_ => { routed = 'second'; }, 0.50)
            )
            .route$()            
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });

    it('should return the higher scoring route when it is second', (done) => {
        let routed;

        p
            .best(
                p.do(_ => { routed = 'first'; }, .5),
                p.do(_ => { routed = 'second'; }, .75)
            )
            .route$()            
            .subscribe(n => {
                expect(routed).to.eql('second');
            }, passErr, done);
    });

    it('should treat missing scores as 1', (done) => {
        let routed;

        p
            .best(
                p.do(_ => { routed = 'first'; }),
                p.do(_ => { routed = 'second'; }, .75)
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });

    it('should return the first of two tied scores', (done) => {
        let routed;

        p
            .best(
                p.do(_ => { routed = 'first'; }, 0.75),
                p.do(_ => { routed = 'second'; }, 0.75)
            )
            .route$()            
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });

});

describe('p.noop', () => {
    it("should execute the handler and return false", (done) => {
        let routed;

        p
            .noop(
                m => {
                    routed = true;
                }
            )
            .route$()
            .subscribe(n => {
                expect(n).to.be.false;
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe('p.ifGet', () => {
    it("should return false on no match when 'else' router doesn't exist", (done) =>
        p
            .ifGet(
                () => undefined,
                p.do(throwErr)
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on no match when 'else' router doesn't exist", (done) =>
        p
            .ifGet(
                () => undefined,
                p.do(throwErr)
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on no match when 'else' router doesn't route", (done) =>
        p
            .ifGet(
                () => undefined,
                p.do(throwErr),
                p.no()
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on match when 'if' router doesn't route and 'else' router exists", (done) =>
        p
            .ifGet(
                () => true,
                p.no(),
                p.do(throwErr)
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should route message to 'if' handler on match when 'else' router doesn't exist", (done) => {
        let routed;

        p
            .ifGet(
                () => true,
                p.do(m => {
                    routed = true;
                })
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'if' handler on match when 'else' router exists", (done) => {
        let routed;

        p
            .ifGet(
                () => true,
                p.do(m => {
                    routed = true;
                }),
                p.do(throwErr)
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' handler on no match", (done) => {
        let routed;

        p
            .ifGet(
                () => undefined,
                p.do(throwErr),
                p.do(m => {
                    routed = true;
                })
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' router on no match", (done) => {
        let routed;

        p
            .ifGet(
                p.no('reason'),
                p.do(throwErr),
                p.do(route => {
                    routed = route.reason;
                })
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.eql('reason');
            }, passErr, done);
    });

    it("should pass value to 'then' router on match", (done) => {
        let routed;

        p
            .ifGet(
                () => 'value',
                p.do(match => {
                    routed = match.value;
                }),
                p.do(throwErr)
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.eql('value');
            }, passErr, done);
    });

    it("should pass supplied value to handler", (done) => {
        let handled;
        p
            .ifGet(
                () => 'dog',
                p.do(match => {
                    handled = match.value;
                })
            )
            .route$()
            .subscribe(_ => {
                expect(handled).to.eql('dog');
            }, passErr, done);
    });

    it("should pass supplied argument all the way through", (done) => {
        let routed;
        p.Router.from(
            greeting => p.ifGet(
                () => greeting,
                p.do(match => { routed = match.value })
            )
        )
            .route$("hey")
            .subscribe(_ => {
                expect(routed).to.eql("hey");
            }, passErr, done);
    });
});

describe('p.if', () => {
    it("should return NoRoute on false when 'else' router doesn't exist", (done) =>
        p
            .if(
                () => false,
                p.do(throwErr)
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return NoRoute on false when 'else' router doesn't route", (done) =>
        p
            .if(
                () => false,
                p.do(throwErr),
                p.no()
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return NoRoute on true when 'if' router doesn't route and 'else' router doesn't exist", (done) =>
        p
            .if(
                () => true,
                p.no()
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return NoRoute on true when 'if' router doesn't route and 'else' router exists", (done) =>
        p
            .if(
                () => true,
                p.no(),
                p.do(throwErr)
            )
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should route message to 'if' handler on true predicate when 'else' router doesn't exist", (done) => {
        let routed;

        p
            .if(
                () => true,
                p.do(() => {
                    routed = true;
                })
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'if' handler on true predicate when 'else' router exists", (done) => {
        let routed;

        p
            .if(
                () => true,
                p.do(() => {
                    routed = true;
                }),
                p.do(throwErr)
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' router on false predicate", (done) => {
        let routed;

        p
            .if(
                () => false,
                p.do(throwErr),
                p.do(() => {
                    routed = true;
                })
            )
            .route$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should throw on string", (done) => {
        p
            .if(
                () => 'foo',
                p.do(throwErr)
            )
            .getRoute$()
            .subscribe(throwErr, error => done(), throwErr);
    });

    it("should throw on object", (done) => {
        p
            .if(
                () => ({ foo: "foo" }),
                p.do(throwErr)
            )
            .getRoute$()
            .subscribe(throwErr, error => done(), throwErr);
    });

    it("should return a default reason on false", (done) => {
        p
            .if(
                () => false,
                p.do(throwErr)
            )
            .getRoute$()
            .subscribe(route => {
                expect(route.reason).to.eql("none");
            }, passErr, done);
    });

    it("should pass supplied reason to 'else' router", (done) => {
        let routed;
        p
            .if(
                p.no('whatevs'),
                p.do(throwErr),
                p.do(no => {
                    routed = no.reason;
                })
            )
            .getRoute$()
            .subscribe(route => {
                expect(route instanceof p.DoRoute).to.be.true;
                route.action();
                expect(routed).to.eql("whatevs");
            }, passErr, done);
    });

    it("should return supplied reason when 'else' router not supplied", (done) => {
        p
            .if(
                p.no('whatevs'),
                p.do(throwErr)
            )
            .getRoute$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql("whatevs");
            }, passErr, done);
    });

    it("should use formal true value", (done) => {
        let handled;

        p
            .if(
                p.match(true, .5),
                p.do(m => { handled = true; })
            )
            .getRoute$()
            .subscribe(route => {
                route.action();
                expect(handled).to.be.true;
                expect(route.score).to.eql(1);
            }, passErr, done);
    });

    it("should use formal false value", (done) => {
        let handled;

        p
            .if(
                p.match(false),
                p.do(throwErr)
            )
            .getRoute$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done);
    });

    it('should allow undefined result for getThenRouter', (done) =>{
        p
            .if(
                () => true,
                () => undefined
            )
            .getRoute$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done);
    });

    it('should allow undefined result for getElseRouter', (done) =>{
        p
            .if(
                () => false,
                throwErr,
                () => undefined
            )
            .getRoute$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done);
    });
});

describe('router.map', () => {
    it('should pass NoRoute through route => route', done => {
        p.no()
            .map(route => route)
            .getRoute$()
            .subscribe(route => {
                expect(p.NoRoute.is(route)).to.be.true;
            }, passErr, done)
    })

    it('should pass DoRoute through route => route', done => {
        p.do(noop)
            .map(route => route)
            .getRoute$()
            .subscribe(route => {
                expect(p.DoRoute.is(route)).to.be.true;
            }, passErr, done)
    })

    it('should translate NoRoute to DoRoute', done => {
        p.no()
            .map(route => new p.DoRoute(noop))
            .getRoute$()
            .subscribe(route => {
                expect(p.DoRoute.is(route)).to.be.true;
            }, passErr, done)
    })
});

describe('router.mapByType', () => {
    it('DoRoute should return do router', done => {
        let handled;

        p.Router
            .from(p.do(noop))
            .mapByType({
                do: p.do(() => { handled = true; }),
                scored: p.do(throwErr),
                route: p.do(throwErr),
                default: p.do(throwErr),
                no: p.do(throwErr),
                match: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('DoRoute should return scored router when do router missing', done => {
        let handled;

        p.Router
            .from(p.do(noop))
            .mapByType({
                scored: p.do(() => { handled = true; }),
                route: p.do(throwErr),
                default: p.do(throwErr),
                no: p.do(throwErr),
                match: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('DoRoute should return route router when do, scored routers missing', done => {
        let handled;

        p.Router
            .from(p.do(noop))
            .mapByType({
                route: p.do(() => { handled = true; }),
                default: p.do(throwErr),
                no: p.do(throwErr),
                match: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('DoRoute should return default router when do, scored, route routers missing', done => {
        let handled;

        p.Router
            .from(p.do(noop))
            .mapByType({
                default: p.do(() => { handled = true; }),
                no: p.do(throwErr),
                match: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('DoRoute should return identity router when do, scored, route, default routers missing', done => {
        let handled;
        let r = new p.DoRoute(() => { handled = true; })

        p.Router
            .from(() => r)
            .mapByType({
                no: p.do(throwErr),
                match: p.do(throwErr)
            })
            .getRoute$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done);
    })

    it('NoRoute should return no router', done => {
        let handled;

        p.Router
            .from(p.no())
            .mapByType({
                do: p.do(throwErr),
                scored: p.do(throwErr),
                route: p.do(throwErr),
                default: p.do(throwErr),
                no: p.do(() => { handled = true; }),
                match: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('NoRoute should return route router when no router mnissing', done => {
        let handled;

        p.Router
            .from(p.no())
            .mapByType({
                do: p.do(throwErr),
                scored: p.do(throwErr),
                route: p.do(() => { handled = true; }),
                default: p.do(throwErr),
                match: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('NoRoute should return default router when no, route routers missing', done => {
        let handled;

        p.Router
            .from(p.no())
            .mapByType({
                do: p.do(throwErr),
                scored: p.do(throwErr),
                default: p.do(() => { handled = true; }),
                match: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('NoRoute should return identity router when no, route, default routers missing', done => {
        let handled;
        let r = new p.NoRoute()

        p.Router
            .from(() => r)
            .mapByType({
                do: p.do(throwErr),
                scored: p.do(throwErr),
                match: p.do(throwErr)
            })
            .getRoute$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done);
    })

    it('MatchRoute should return match router', done => {
        let handled;

        p.Router
            .from(p.match("hi"))
            .mapByType({
                do: p.do(throwErr),
                scored: p.do(throwErr),
                route: p.do(throwErr),
                default: p.do(throwErr),
                no: p.do(throwErr),
                match: p.do(() => { handled = true; }),
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('MatchRoute should return scored router when match router missing', done => {
        let handled;

        p.Router
            .from(p.match("hi"))
            .mapByType({
                do: p.do(throwErr),
                scored: p.do(() => { handled = true; }),
                route: p.do(throwErr),
                default: p.do(throwErr),
                no: p.do(throwErr),
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('MatchRoute should return route router when match, scored routers missing', done => {
        let handled;

        p.Router
            .from(p.match("hi"))
            .mapByType({
                do: p.do(throwErr),
                route: p.do(() => { handled = true; }),
                default: p.do(throwErr),
                no: p.do(throwErr),
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('MatchRoute should return default router when match, scored, route routers missing', done => {
        let handled;

        p.Router
            .from(p.match("hi"))
            .mapByType({
                do: p.do(throwErr),
                default: p.do(() => { handled = true; }),
                no: p.do(throwErr),
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('MatchRoute should return identity router when match, route, default routers missing', done => {
        let handled;
        let r = new p.MatchRoute("hi")

        p.Router
            .from(() => r)
            .mapByType({
                do: p.do(throwErr),
                no: p.do(throwErr)
            })
            .getRoute$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done);
    })
})

describe('p.filterForDoRoute', () => {
    it('should pass through DoRoute', done => {
        let r = new p.DoRoute(noop)
        p.Router.from(() => r)
            .map(p.filterForDoRoute)
            .getRoute$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done)
    })

    it('should pass through NoRoute', done => {
        let r = new p.NoRoute()
        p.Router.from(() => r)
            .map(p.filterForDoRoute)
            .getRoute$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done)
    })

    it('should throw on MatchRoute', done => {
        let r = new p.match("hello")
        p.Router.from(() => r)
            .map(p.filterForDoRoute)
            .getRoute$()
            .subscribe(throwErr, passErr => done(), throwErr)
    })

})

describe("router.before", () => {
    it("should pass through NoRoute", (done) => {
        p
            .no()
            .beforeDo(throwErr)
            .route$()
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done);
    });

    it("should run 'before' action and then router's action", (done) => {
        let handled = false;
        let routed = false;

        p
            .do(() => {
                expect(handled).to.be.true;
                routed = true;
            })
            .beforeDo(() => {
                expect(routed).to.be.false;
                handled = true;
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;                
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe("p.after", () => {
    it("should return false with NoRoute", (done) => {
        p
            .no()
            .afterDo(throwErr)
            .route$()
            .subscribe(t => expect(t).to.be.false, passErr, done);
    });


    it("should run 'after' handler and then router's action", (done) => {
        let handled = false;
        let routed = false;
    
        p
            .do(() => {
                expect(handled).to.be.false;
                routed = true;
            })
            .afterDo(() => {
                expect(routed).to.be.true;
                handled = true;
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe("router.default", () => {
    it("should not be run when main router returns an action route", (done) => {
        let routed;
    
        p
            .do(m => {
                routed = true;
            })
            .default(no => p.do(throwErr))
            .route$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should be run when router returns no route", (done) => {
        let handled;

        p
            .no('reason')
            .default(route => {
                handled = route.reason;
            })
            .route$()
            .subscribe(n => {
                expect(handled).to.eql('reason');
            }, passErr, done);
    });

    it('should return NoRoute when both router and default router return NoRoute', (done) =>{
        p
            .no('reason')
            .default(p.no('another reason'))
            .getRoute$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql('another reason');
            }, passErr, done);
    });

    it('should allow undefined result for default router', (done) =>{
        p
            .no('reason')
            .default(route => undefined)
            .getRoute$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql('none');
            }, passErr, done);
    });
});

describe('inline Router', () => {
    it("should pass through no route", (done) =>
        p
            .do(() =>
                p
                    .no()
                    .route$()
            )
            .route$()
            .subscribe(t => expect(t).to.be.true, passErr, done)
    );

    it("should run handler", (done) => {
        let handled;

        p
            .do(() => p
                .do(() => {
                    handled = true;
                })
                .route$()
            )
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe('p.switch', () => {
    it("doesn't route on undefined key", done => {
        p
            .switch(() => undefined, {
                foo: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("doesn't route on null key", done => {
        
        p
            .switch(() => null, {
                foo: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("doesn't route on non-matching key", done => {
        p
            .switch(() => 'bar', {
                foo: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("routes matching key", done => {
        let routed = false;
        p
            .switch(() => 'foo', {
                foo: p.do(() => {
                    routed = true;
                }),
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("routes matching key when first", done => {
        let routed = false;
        p
            .switch(() => 'foo', {
                foo: p.do(() => {
                    routed = true;
                }),
                bar: p.do(throwErr)
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("routes matching key when second", done => {
        let routed = false;
        p
            .switch(() => 'foo', {
                bar: p.do(throwErr),
                foo: p.do(() => {
                    routed = true;
                })
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("doesn't route when router for key doesn't route", done => {
        p
            .switch(() => 'foo', {
                foo: p.no()
            })
            .route$()
            .subscribe(t => {
                expect(t).to.be.false;       
            }, passErr, done);
    });
});
