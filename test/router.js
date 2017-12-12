"use strict";

const chai = require('chai');
chai.use(require('chai-subset'));
const expect = chai.expect;
const { toObservable, Router } = require('../dist/prague.js');
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

const routerNo = (reason) => new Router(Router.getRouteNo$(reason));
const routerDo = (handler, score) => new Router(Router.getRouteDo$(handler, score));

const noop = () => {}

describe('toObservable', () => {
    it("should convert a number to an observable", (done) => {
        toObservable(5)
            .subscribe(n => {
                expect(n).to.eql(5);
            }, passErr, done);       
    });

    it("should convert a string to an observable", (done) => {
        toObservable("Prague")
            .subscribe(n => {
                expect(n).to.eql("Prague");
            }, passErr, done);
    });

    it("should convert an array to an observable", (done) => {
        toObservable([1, 2, 3])
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
            }, passErr, done);       
    });

    it("should convert a Promise<number> to an observable", (done) => {
        toObservable(Promise.resolve(5))
            .subscribe(n => {
                expect(n).to.eql(5);
            }, passErr, done);       
    });

    it("should convert a Promise<string> to an observable", (done) => {
        toObservable(Promise.resolve("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
            }, passErr, done);       
    });

    it("should convert a Promise<array> to an observable", (done) => {
        toObservable(Promise.resolve([1, 2, 3]))
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
            }, passErr, done);       
    });

    it("should convert an Observable<number> to an observable", (done) => {
        toObservable(Observable.of(5))
            .subscribe(n => {
                expect(n).to.eql(5);
            }, passErr, done);       
    });

    it("should convert an Observable<string> to an observable", (done) => {
        toObservable(Observable.of("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
            }, passErr, done);       
    });

    it("should convert an Observable<array> to an observable", (done) => {
        toObservable(Observable.of([1, 2, 3]))
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
            }, passErr, done);       
    });

    it("should convert null to an observable", (done) => {
        toObservable(null)
            .subscribe(n => {
                expect(n).to.eql(null);
            }, passErr, done);       
    });

    it("should convert undefined to an observable", (done) => {
        toObservable(undefined)
            .subscribe(n => {
                expect(n).to.eql(undefined);
            }, passErr, done);       
    });

    it("should convert Promise<null> to an observable", (done) => {
        toObservable(Promise.resolve(null))
            .subscribe(n => {
                expect(n).to.eql(null);
            }, passErr, done);       
    });

    it("should convert Promise<undefined> to an observable", (done) => {
        toObservable(Promise.resolve(undefined))
            .subscribe(n => {
                expect(n).to.eql(undefined);
            }, passErr, done);       
    });

    it("should convert Observable<null> to an observable", (done) => {
        toObservable(Observable.of(null))
            .subscribe(n => {
                expect(n).to.eql(null);
            }, passErr, done);       
    });

    it("should convert Observable<undefined> to an observable", (done) => {
        toObservable(Observable.of(undefined))
            .subscribe(n => {
                expect(n).to.eql(undefined);
            }, passErr, done);       
    });

    it("should complete and never emit on Observable.empty()", (done) => {
        toObservable(Observable.empty())
            .subscribe(throwErr, passErr, done);       
    });

});

describe('Router.actionRoute', () => {
    it('should create an ActionRoute with supplied action and no score', () => {
        let action = () => {};
        let route = Router.actionRoute(action);
        expect(route.type).to.eql('action');
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(1);
    });

    it('should create an ActionRoute with supplied action and score', () => {
        let action = () => {};
        let route = Router.actionRoute(action, 0.5);
        expect(route.type).to.eql('action');
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(.5);
        expect(route.reason).to.be.undefined;
    });
});

describe('router._getRoute$', () => {
    it('should return action route', done => {
        let theRoute = {
            type: 'action',
            action: noop
        }
        new Router(routable => Observable.of(theRoute))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route).to.eql(theRoute);
            }, passErr, done);
    });

    it('should return no route', done => {
        let theRoute = {
            type: 'no',
            reason: 'reason'
        }
        new Router(routable => Observable.of(theRoute))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route).to.eql(theRoute);
            }, passErr, done);
    });
})

describe('Router.getRouteDo$', () => {
    it('should return an ActionRoute using supplied handler and no score', (done) => {
        let handled;
        routerDo(m => { handled = m; })
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.type).to.eql('action');
                expect(route.score).to.eql(1);
                route.action();
                expect(handled).to.eql(foo);
            }, passErr, done);
    });

    it('should return an ActionRoute using supplied handler and score', (done) => {
        let handled;
        routerDo(m => { handled = m; }, .5)
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.type).to.eql('action');
                expect(route.score).to.eql(.5);
                route.action();
                expect(handled).to.eql(foo);
            }, passErr, done);
    });
});

describe('Router.noRoute', () => {
    it('should create a NoRoute with default reason', () => {
        let route = Router.noRoute();
        expect(route.type).to.eql('no');
        expect(route.reason).to.eql('none');
        expect(route.action).to.be.undefined;
        expect(route.score).to.be.undefined;
    });

    it('should create a NoRoute with supplied reason', () => {
        let route = Router.noRoute('reason');
        expect(route.type).to.eql('no');
        expect(route.reason).to.eql('reason');
        expect(route.action).to.be.undefined;
        expect(route.score).to.be.undefined;
    });
});

describe('Router.getRouteNo$', () => {
    it('should return a NoRoute with the default reason', done => {
        routerNo()
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.type).to.eql('no');
                expect(route.reason).to.eql('none');
            }, passErr, done);
    });

    it('should return a NoRoute with the default reason', done => {
        routerNo('reason')
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.type).to.eql('no');
                expect(route.reason).to.eql('reason');
            }, passErr, done);
    });
});

describe('Router.route$', () => {
    it("should return false on when router returns NoRoute", (done) => {
        Router.route$(foo, routerNo())
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done);
    });

    it("should return true when router returns ActionRoute", (done) => {
        let routed;

        Router.route$(foo, routerDo(() => {
            routed = true;
        }))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe("Router.getRouteBefore$", () => {
    it("should return false with routerNo()", (done) => {
        Router.route$(foo, new Router(Router.getRouteBefore$(
                throwErr,
                routerNo()
            ))
        )
            .subscribe(t => expect(t).to.be.false, passErr, done);
    });


    it("should run 'before' handler and then router's action", (done) => {
        let handled = false;
        let routed = false;
    
        Router.route$(foo, new Router(Router.getRouteBefore$(
                m => {
                    expect(routed).to.be.false;
                    handled = true;
                },
                routerDo(m => {
                    expect(handled).to.be.true;
                    routed = true;
                })
            ))
        )
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe("Router.getRouteBefore$", () => {
    it("should return false with routerNo()", (done) => {
        Router.route$(foo, new Router(Router.getRouteAfter$(
                throwErr,
                routerNo()
            ))
        )
            .subscribe(t => expect(t).to.be.false, passErr, done);
    });


    it("should run 'after' handler and then router's action", (done) => {
        let handled = false;
        let routed = false;
    
        Router.route$(foo, new Router(Router.getRouteAfter$(
                m => {
                    expect(routed).to.be.true;
                    handled = true;
                },
                routerDo(m => {
                    expect(handled).to.be.false;
                    routed = true;
                })
            ))
        )
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe("Router.getRouteDefault$", () => {
    it("should not be run when main router returns an action route", (done) => {
        let routed;
    
        Router.route$(foo, new Router(Router.getRouteDefault$(
                routerDo(m => {
                    routed = true;
                }),
                reason => routerDo(throwErr)
            ))
        )
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should be run when router returns no route", (done) => {
        let handled;

        Router.route$(foo, new Router(Router.getRouteDefault$(
                routerNo(),
                reason => routerDo(m => {
                    handled = true;
                })
            ))
        )
            .subscribe(n => {
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe('Router.getRouteFirst$', () => {
    it('should return false on no routers', (done) =>
        Router.route$(foo, new Router(Router.getRouteFirst$()))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only null/undefined routers', (done) =>
        Router.route$(foo, new Router(Router.getRouteFirst$(
            null,
            undefined
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only unsuccessful and null/undefined routers', (done) =>
        Router.route$(foo, new Router(Router.getRouteFirst$(
                routerNo(),
                null,
                undefined
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on no successful routers', (done) => {
        Router.route$(foo, new Router(Router.getRouteFirst$(
            routerNo()
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    });

    it('should route to a single successful router', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteFirst$(
            routerDo(m => {
                routed = true;
            })
        )))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should ignore null/undefined routers and route to a successful router', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteFirst$(
            null,
            undefined,
            routerDo(m => {
                routed = true;
            })
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should skip an unsuccessful router and route to a successful router', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteFirst$(
            routerNo(),
            routerDo(m => {
                routed = true;
            })
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

});

describe('tryInScoreOrder', () => {
    it('should return false on no routers', (done) =>
        Router.route$(foo, new Router(Router.getRouteBest$()))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only null/undefined routers', (done) =>
        Router.route$(foo, new Router(Router.getRouteBest$(
            null,
            undefined
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only unsuccessful and null/undefined routers', (done) =>
        Router.route$(foo, new Router(Router.getRouteBest$(
            routerNo(),
            null,
            undefined
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on no successful routers', (done) => {
        Router.route$(foo, new Router(Router.getRouteBest$(
            routerNo()
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    });

    it('should route to a single successful scoreless router', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteBest$(
            routerDo(m => {
                routed = true;
            })
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should ignore null/undefined routers and route to a successful scoreless router', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteBest$(
            null,
            undefined,
            routerDo(m => {
                routed = true;
            })
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should skip an unsuccessful router and route to a successful scoreless router', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteBest$(
            routerNo(),
            routerDo(m => {
                routed = true;
            })
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should return the first route where score=1, never trying the rest', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteBest$(
            routerDo(m => {
                routed = true;
            }),
            throwErr
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should return the higher scoring route when it is first', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteBest$(
            routerDo(_ => { routed = 'first'; }, 0.75),
            routerDo(_ => { routed = 'second'; }, 0.50)
        )))
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });

    it('should return the higher scoring route when it is second', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteBest$(
            routerDo(_ => { routed = 'first'; }, .5),
            routerDo(_ => { routed = 'second'; }, .75)
        )))
            .subscribe(n => {
                expect(routed).to.eql('second');
            }, passErr, done);
    });

    it('should treat missing scores as 1', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteBest$(
            routerDo(_ => { routed = 'first'; }),
            routerDo(_ => { routed = 'second'; }, .75)
        )))
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });

    it('should return the first of two tied scores', (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteBest$(
            routerDo(_ => { routed = 'first'; }, 0.75),
            routerDo(_ => { routed = 'second'; }, 0.75)
        )))
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });
});

describe('Router.noop', () => {
    it("should execute the handler and return false", (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteNoop$(
            m => {
                routed = true;
            }
        )))
            .subscribe(n => {
                expect(n).to.be.false;
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe('Router.routeWithCombinedScore', () => {
    it("should return combined score", () => {
        expect(Router.routeWithCombinedScore(
            Router.actionRoute(() => {}, .4),
            .25
        ).score).to.eql(.1);
    });
})

describe('ifTrue', () => {
    it("should return false on false when 'else' router doesn't exist", (done) =>
        Router.route$(foo, new Router(Router.getRouteIfTrue$(
            m => false,
            () => routerDo(throwErr)
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on false when 'else' router doesn't route", (done) =>
        Router.route$(foo, new Router(Router.getRouteIfTrue$(
            m => false,
            () => routerDo(throwErr),
            () => routerNo()
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on true when 'if' router doesn't route and 'else' router doesn't exist", (done) =>
        Router.route$(foo, new Router(Router.getRouteIfTrue$(
            m => true,
            () => routerNo()
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on true when 'if' router doesn't route and 'else' router exists", (done) =>
        Router.route$(foo, new Router(Router.getRouteIfTrue$(
            m => true,
            () => routerNo(),
            () => routerDo(throwErr)
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should route message to 'if' handler on true predicate when 'else' router doesn't exist", (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteIfTrue$(
            m => true,
            () => routerDo(m => {
                routed = true;
            })
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'if' handler on true predicate when 'else' router exists", (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteIfTrue$(
            m => true,
            () => routerDo(m => {
                routed = true;
            }),
            () => routerDo(throwErr)
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' router on false predicate", (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteIfTrue$(
            m => false,
            () => routerDo(throwErr),
            () => routerDo(m => {
                routed = true;
            })
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should return score=1 on true predicate when 'if' score undefined", (done) => {
        new Router(Router.getRouteIfTrue$(
            m => true,
            () => routerDo(m => {})
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.score).to.eql(1);
            }, passErr, done);
    });

    it("should return route score on true predicate", (done) => {
        new Router(Router.getRouteIfTrue$(
            m => true,
            () => routerDo(() => {}, 0.25)
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.25);
            }, passErr, done);
    });

    it("should return score=1 on false predicate when 'else' score undefined", (done) => {
        new Router(Router.getRouteIfTrue$(
            m => false,
            () => routernDo(throwErr),
            () => routerDo(m => {})
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.score).to.eql(1);
            }, passErr, done);
    });

    it("should return 'else' route score on false predicate", (done) => {
        new Router(Router.getRouteIfTrue$(
            m => false,
            () => routerDo(throwErr),
            () => routerDo(_ => {}, .5)
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.5);
            }, passErr, done);
    });

    it("should throw on string", (done) => {
        new Router(Router.getRouteIfTrue$(
            m => 'foo',
            () => routerDo(throwErr)
        ))
            ._getRoute$(foo)
            .subscribe(throwErr, error => {
                done();
            }, throwErr);
    });

    it("should throw on object", (done) => {
        new Router(Router.getRouteIfTrue$(
            m => ({ foo: "foo" }),
            () => routerDo(throwErr)
        ))
            ._getRoute$(foo)
            .subscribe(throwErr, error => {
                done();
            }, throwErr);
    });

    it("should return a default reason on false", (done) => {
        new Router(Router.getRouteIfTrue$(
            m => false,
            () => routerDo(throwErr)
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.reason).to.eql("none");
            }, passErr, done);
    });

    it("should pass supplied reason to 'else' router", (done) => {
        let routed;
        new Router(Router.getRouteIfTrue$(
            m => ({ reason: 'whatevs' }),
            () => routerDo(throwErr),
            (_, reason) => routerDo(m => {
                routed = reason;
            })
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.type === 'action');
                route.action();
                expect(routed).to.eql("whatevs");
            }, passErr, done);
    });

    it("should return supplied reason when 'else' router not supplied", (done) => {
        new Router(Router.getRouteIfTrue$(
            m => ({ reason: 'whatevs' }),
            () => routerDo(throwErr)
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.type).to.eql('no');
                expect(route.reason).to.eql("whatevs");
            }, passErr, done);
    });

    it("should use formal true value", (done) => {
        let handled;

        new Router(Router.getRouteIfTrue$(
            m => ({ value: true, score: .5 }),
            () => routerDo(m => { handled = true; })
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                route.action();
                expect(handled).to.be.true;
                expect(route.score).to.eql(.5);
            }, passErr, done);
    });

    it("should use formal false value", (done) => {
        let handled;

        new Router(Router.getRouteIfTrue$(
            m => ({ value: false }),
            () => routerDo(throwErr)
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.type).to.eql('no')
            }, passErr, done);
    });
});

describe('ifMatches', () => {
    it("should return false on no match when 'else' router doesn't exist", (done) =>
        Router.route$(notFoo, new Router(Router.getRouteIfMatches$(
            barIfFoo,
            () => routerDo(throwErr)
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on no match when 'else' router doesn't exist", (done) =>
        Router.route$(notFoo, new Router(Router.getRouteIfMatches$(
            barIfFoo,
            () => routerDo(throwErr)
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on no match when 'else' router doesn't route", (done) =>
        Router.route$(notFoo, new Router(Router.getRouteIfMatches$(
            barIfFoo,
            () => routerDo(throwErr),
            () => routerNo()
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on match when 'if' router doesn't route and 'else' router exists", (done) =>
        Router.route$(foo, new Router(Router.getRouteIfMatches$(
            barIfFoo,
            () => routerNo(),
            () => routerDo(throwErr)
        )))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should route message to 'if' handler on match when 'else' router doesn't exist", (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteIfMatches$(
            barIfFoo,
            () => routerDo(m => {
                routed = true;
            })
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'if' handler on match when 'else' router exists", (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteIfMatches$(
            barIfFoo,
            ()=> routerDo(m => {
                routed = true;
            }),
            () => routerDo(throwErr)
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' handler on no match", (done) => {
        let routed;

        Router.route$(notFoo, new Router(Router.getRouteIfMatches$(
            barIfFoo,
            () => routerDo(throwErr),
            () => routerDo(m => {
                routed = true;
            })
        )))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' router on no match", (done) => {
        let routed;

        Router.route$(notFoo, new Router(Router.getRouteIfMatches$(
            c => ({ reason: 'reason' }),
            () => routerDo(throwErr),
            (c, reason) => routerDo(m => {
                routed = reason;
            })
        )))
            .subscribe(n => {
                expect(routed).to.eql('reason');
            }, passErr, done);
    });

    it("should pass value to 'then' router on match", (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteIfMatches$(
            c => ({ value: 'value' }),
            (_, value) => routerDo(c => {
                routed = value;
            }),
            () => routerDo(throwErr)
        )))
            .subscribe(n => {
                expect(routed).to.eql('value');
            }, passErr, done);
    });

    it("should pass value to 'then' handler on match", (done) => {
        let routed;

        Router.route$(foo, new Router(Router.getRouteIfMatches$(
            c => ({ value: 'value' }),
            (c, value) => routerDo(() => {
                routed = value;
            }),
            () => routerDo(throwErr)
        )))
            .subscribe(n => {
                expect(routed).to.eql('value');
            }, passErr, done);
    });

    it("should return score=1 when score not supplied", (done) => {
        new Router(Router.getRouteIfMatches$(
            barIfFoo,
            () => routerDo(m => {})
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.score).to.eql(1);
                done();
            })
    });

    it("should return supplied score", (done) => {
        new Router(Router.getRouteIfMatches$(
            m => ({ value: 'dog', score: 0.4 }),
            () => routerDo(m => {})
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.4);
            }, passErr, done);
    });

    it("should pass supplied value to handler", (done) => {
        let handled;
        Router.route$(foo, new Router(Router.getRouteIfMatches$(
            m => ({ value: 'dog' }),
            (m, value) => routerDo(() => {
                handled = value;
            })
        )))
            .subscribe(_ => {
                expect(handled).to.eql('dog');
            }, passErr, done);
    });

    it("should return combined score when route score supplied", (done) => {
        new Router(Router.getRouteIfMatches$(
            barIfFoo,
            () => routerDo(() => {}, .25)
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.25);
            }, passErr, done);
    });

    it("should return combined score when both scores supplied", (done) => {
        new Router(Router.getRouteIfMatches$(
            m => ({ value: 'cat', score: 0.4 }),
            () => routerDo(() => {}, .25)
        ))
            ._getRoute$(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.1);
            }, passErr, done);
    });

    it("should return 'else' route score on no match", (done) => {
        new Router(Router.getRouteIfMatches$(
            barIfFoo,
            () => routerDo(throwErr),
            () => routerDo(() => {}, .5)
        ))
            ._getRoute$(notFoo)
            .subscribe(route => {
                expect(route.score).to.eql(.5);
            }, passErr, done);
    });

});

describe('inline Router', () => {
    it("should pass through no route", (done) =>
        Router.route$(foo, routerDo(c =>
            Router.route$(c, routerNo())
        ))
            .subscribe(t => expect(t).to.be.true, passErr, done)
    );

    it("should run handler", (done) => {
        let handled;

        Router.route$(foo, routerDo(c =>
            Router.route$(c, routerDo(c => {
                handled = true;
            }))
        ))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe('trySwitch', () => {
    it("doesn't route on undefined key", done => {
        Router.route$(foo, new Router(Router.getRouteSwitch$(c => undefined, {
            foo: routerDo(throwErr)
        })))
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("doesn't route on null key", done => {
        Router.route$(foo, new Router(Router.getRouteSwitch$(c => undefined, {
            foo: routerDo(throwErr)
        })))
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("doesn't route on non-matching key", done => {
        Router.route$(foo, new Router(Router.getRouteSwitch$(c => 'bar', {
            foo: routerDo(throwErr)
        })))
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("routes matching key", done => {
        let routed = false;
        Router.route$(foo, new Router(Router.getRouteSwitch$(c => 'foo', {
            foo: routerDo(c => {
                routed = true;
            }),
        })))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("routes matching key when first", done => {
        let routed = false;
        Router.route$(foo, new Router(Router.getRouteSwitch$(c => 'foo', {
            foo: routerDo(c => {
                routed = true;
            }),
            bar: routerDo(throwErr)
        })))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("routes matching key when second", done => {
        let routed = false;
        Router.route$(foo, new Router(Router.getRouteSwitch$(c => 'foo', {
            bar: routerDo(throwErr),
            foo: routerDo(c => {
                routed = true;
            })
        })))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("doesn't route when router for key doesn't route", done => {
        Router.route$(foo, new Router(Router.getRouteSwitch$(c => 'foo', {
            foo: routerNo()
        })))
            .subscribe(t => {
                expect(t).to.be.false;       
            }, passErr, done);
    });
});
