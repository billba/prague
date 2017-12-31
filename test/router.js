"use strict";

const chai = require('chai');
chai.use(require('chai-subset'));
const expect = chai.expect;
const p = require('../dist/prague.js');
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

describe('p.noRoute', () => {
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
    it('should return a function returning doRoute using supplied action and no score', () => {
        let handled;
        let route = p.do(m => { handled = m; })(foo);

        expect(route instanceof p.DoRoute).to.be.true;
        expect(route.score).to.eql(1);
        route.action();
        expect(handled).to.eql(foo);
    });

    it('should return a function returning doRoute using supplied action and no score', () => {
        let handled;
        let route = p.do(m => { handled = m; }, .5)(foo);

        expect(route instanceof p.DoRoute).to.be.true;
        expect(route.score).to.eql(.5);
        route.action();
        expect(handled).to.eql(foo);
    });
});

describe('p.no', () => {
    it('should return a NoRoute with the default reason', () => {
        let route = p.no()(foo)
        expect(route instanceof p.NoRoute).to.be.true;
        expect(route.reason).to.eql('none');
    });

    it('should return a NoRoute with the supplied reason', () => {
        let route = p.no('reason')(foo);
        expect(route instanceof p.NoRoute).to.be.true;
        expect(route.reason).to.eql('reason');
    });
});

describe('p.getRoute$', () => {
    it('should throw on a non-router.', (done) => {
        p
            .getRoute$("non-route")
            .subscribe(throwErr, error => done(), throwErr);
    });

    it('should return a MatchRoute on a function returning a non-route', (done) => {
        p
            .getRoute$(() => "non-route")
            .subscribe(route => {
                expect(route instanceof p.MatchRoute).to.be.true;
            }, passErr, done);
    });

    it('should return a MatchRoute on a function returning a function returning a non-route', (done) => {
        p
            .getRoute$(() => () => "non-route")
            .subscribe(route => {
                expect(route instanceof p.MatchRoute).to.be.true;
            }, passErr, done);
    });

    it('should return a Noroute from an undefined router', (done) => {
        p
            .getRoute$(undefined)
            .subscribe(r => {        
                expect(r instanceof p.NoRoute).to.be.true;
            }, passErr, done);
    });

    it('should return a route from a SingleRouter, passing no value', (done) => {
        let route = new p.DoRoute(() => {});

        p
            .getRoute$(() => route)
            .subscribe(r => {        
                expect(r).to.eql(route);
            }, passErr, done);
    });

    it('should return a route from a SingleRouter, passing the value', (done) => {
        let routed;
    
        p
            .getRoute$((value) => new p.DoRoute(() => { routed = value }), "value")
            .subscribe(r => {
                r.action();
                expect(routed).to.eql("value");
            }, passErr, done);
    });

    it('should return a route from a DoubleRouter, passing no value', (done) => {
        let route = new p.DoRoute(() => {});
        p
            .getRoute$((value) => () => route)
            .subscribe(r => {        
                expect(r).to.eql(route);
            }, passErr, done);
    });

    it('should return a route from a DoubleRouter, passing through the value', (done) => {
        let routed;
        p
            .getRoute$((value) => () => new p.DoRoute(() => { routed = value; }), "value")
            .subscribe(r => {
                expect(r instanceof p.DoRoute).to.be.true;
                r.action();   
                expect(routed).to.eql("value");
            }, passErr, done);
    });

});

describe('p.route$', () => {
    it("should return false on NoRoute with no arg", (done) => {
        p.route$(
            p.no()
        )
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done);
    });

    it("should return false on NoRoute with arg", (done) => {
        p.route$(
            p.no(),
            foo
        )
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done);
    });

    it("should return true on DoRoute with no arg", (done) => {
        let routed;

        p.route$(
            p.do(() => {
                routed = true;
            })
        )
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should return true on DoRoute with arg", (done) => {
        let routed;

        p.route$(
            p.do(() => {
                routed = true;
            }),
            foo
        )
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should return true on DoRoute, passing arg to action", (done) => {
        let routed;

        p.route$(
            p.do(m => {
                routed = m;
            }),
            foo
        )
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.eql(foo);
            }, passErr, done);
    });
});

describe('p.first', () => {

    it('should return false on no routers', (done) =>
        p.route$(p.first())
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only null/undefined routers', (done) =>
        p.route$(p.first(
            null,
            undefined
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only unsuccessful and null/undefined routers', (done) =>
        p.route$(p.first(
            p.no(),
            null,
            undefined
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on no successful routers', (done) => {
        p.route$(p.first(
            p.no()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    });

    it('should route to a single successful router', (done) => {
        let routed;

        p.route$(p.first(
            p.do(m => {
                routed = true;
            })
        ))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should ignore null/undefined routers and route to a successful router', (done) => {
        let routed;

        p.route$(p.first(
            null,
            undefined,
            p.do(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should skip an unsuccessful router and route to a successful router', (done) => {
        let routed;

        p.route$(p.first(
            p.no(),
            p.do(m => {
                routed = true;
            })
        ))
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

describe('p.DoScore.clone', () => {
    it("should return route with supplied score", () => {
        expect(new p.DoRoute(() => {}, .4).clone(.25).score).to.eql(.25);
    });
})


describe('p.best', () => {
    it('should return NoRoute on no routers', (done) => {
        p.route$(p.best())
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done)
    });

    it('should return NoRoute on only null/undefined routers', (done) =>
        p.route$(p.best(
            null,
            undefined
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return NoRoute on only unsuccessful and null/undefined routers', (done) =>
        p.route$(p.best(
            p.no(),
            null,
            undefined
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return NoRoute on no successful routers', (done) => {
        p.route$(p.best(
            p.no()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    });

    it('should route to a single successful scoreless router', (done) => {
        let routed;

        p.route$(p.best(
            p.do(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should ignore null/undefined routers and route to a successful scoreless router', (done) => {
        let routed;

        p.route$(p.best(
            null,
            undefined,
            p.do(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should skip an unsuccessful router and route to a successful scoreless router', (done) => {
        let routed;

        p.route$(p.best(
            p.no(),
            p.do(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should return the first route where score=1, never trying the rest', (done) => {
        let routed;

        p.route$(p.best(
            p.do(m => {
                routed = true;
            }),
            throwErr
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should return the higher scoring route when it is first', (done) => {
        let routed;

        p.route$(p.best(
            p.do(_ => { routed = 'first'; }, 0.75),
            p.do(_ => { routed = 'second'; }, 0.50)
        ))
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });

    it('should return the higher scoring route when it is second', (done) => {
        let routed;

        p.route$(p.best(
            p.do(_ => { routed = 'first'; }, .5),
            p.do(_ => { routed = 'second'; }, .75)
        ))
            .subscribe(n => {
                expect(routed).to.eql('second');
            }, passErr, done);
    });

    it('should treat missing scores as 1', (done) => {
        let routed;

        p.route$(p.best(
            p.do(_ => { routed = 'first'; }),
            p.do(_ => { routed = 'second'; }, .75)
        ))
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });

    it('should return the first of two tied scores', (done) => {
        let routed;

        p.route$(p.best(
            p.do(_ => { routed = 'first'; }, 0.75),
            p.do(_ => { routed = 'second'; }, 0.75)
        ))
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });

});

describe('p.noop', () => {
    it("should execute the handler and return false", (done) => {
        let routed;

        p.route$(p.noop(
            m => {
                routed = true;
            }
        ))
            .subscribe(n => {
                expect(n).to.be.false;
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe('p.ifGet', () => {
    it("should return false on no match when 'else' router doesn't exist", (done) =>
        p.route$(p.ifGet(
            () => undefined,
            p.do(throwErr)
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on no match when 'else' router doesn't exist", (done) =>
        p.route$(p.ifGet(
            () => undefined,
            p.do(throwErr)
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on no match when 'else' router doesn't route", (done) =>
        p.route$(p.ifGet(
            () => undefined,
            p.do(throwErr),
            p.no()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on match when 'if' router doesn't route and 'else' router exists", (done) =>
        p.route$(
            p.ifGet(
                () => true,
                p.no(),
                p.do(throwErr)
            )
        )
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should route message to 'if' handler on match when 'else' router doesn't exist", (done) => {
        let routed;

        p.route$(
            p.ifGet(
                () => true,
                p.do(m => {
                    routed = true;
                })
            )
        )
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'if' handler on match when 'else' router exists", (done) => {
        let routed;

        p.route$(
            p.ifGet(
                () => true,
                p.do(m => {
                    routed = true;
                }),
                p.do(throwErr)
            )
        )
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' handler on no match", (done) => {
        let routed;

        p.route$(
            p.ifGet(
                () => undefined,
                p.do(throwErr),
                p.do(m => {
                    routed = true;
                })
            )
        )
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' router on no match", (done) => {
        let routed;

        p.route$(
            p.ifGet(
                p.no('reason'),
                p.do(throwErr),
                p.do(route => {
                    routed = route.reason;
                })
            )
        )
            .subscribe(n => {
                expect(routed).to.eql('reason');
            }, passErr, done);
    });

    it("should pass value to 'then' router on match", (done) => {
        let routed;

        p.route$(
            p.ifGet(
                () => 'value',
                p.do(match => {
                    routed = match.value;
                }),
                p.do(throwErr)
            )
        )
            .subscribe(n => {
                expect(routed).to.eql('value');
            }, passErr, done);
    });

    it("should return score=1 when score not supplied", (done) => {
        p.ifGet(
            () => 5,
            p.do(() => {})
        )
            ()
            .subscribe(route => {
                expect(route.score).to.eql(1);
                done();
            })
    });

    it("should return supplied score", (done) => {
        p.ifGet(
            p.match('dog', 0.4),
            p.do(m => {})
        )
            ()
            .subscribe(route => {
                expect(route.score).to.eql(.4);
            }, passErr, done);
    });

    it("should pass supplied value to handler", (done) => {
        let handled;
        p.route$(p.ifGet(
            () => 'dog',
            p.do(match => {
                handled = match.value;
            })
        ))
            .subscribe(_ => {
                expect(handled).to.eql('dog');
            }, passErr, done);
    });

    it("should return route score when no match score supplied", (done) => {
        p.ifGet(
            () => "dog",
            p.do(() => {}, .25)
        )
            ()
            .subscribe(route => {
                expect(route.score).to.eql(.25);
            }, passErr, done);
    });

    it("should return combined score when both scores supplied", (done) => {
        p.ifGet(
            p.match('cat', 0.4),
            p.do(() => {}, .25)
        )
            ()
            .subscribe(route => {
                expect(route.score).to.eql(.1);
            }, passErr, done);
    });

    it("should return 'else' route score on no match", (done) => {
        p.ifGet(
            () => undefined,
            p.do(throwErr),
            p.do(() => {}, .5)
        )
            ()
            .subscribe(route => {
                expect(route.score).to.eql(.5);
            }, passErr, done);
    });

    it("should pass supplied argument all the way through", (done) => {
        let routed;
        p.route$(
            greeting => p.ifGet(
                () => greeting,
                p.do(match => { routed = match.value })
            ),
            "hey"
        )
            .subscribe(_ => {
                expect(routed).to.eql("hey");
            }, passErr, done);
    });

    it("should pass supplied argument all the way through using long form", (done) => {
        let routed;
        p.route$(
            greeting => p.ifGet(
                () => greeting,
                match => p.do(() => { routed = match.value })
            ),
            "hey"
        )
            .subscribe(_ => {
                expect(routed).to.eql("hey");
            }, passErr, done);
    });
});

describe('p.if', () => {
    it("should return NoRoute on false when 'else' router doesn't exist", (done) =>
        p.route$(p.if(
            () => false,
            p.do(throwErr)
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return NoRoute on false when 'else' router doesn't route", (done) =>
        p.route$(p.if(
            () => false,
            p.do(throwErr),
            p.no()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return NoRoute on true when 'if' router doesn't route and 'else' router doesn't exist", (done) =>
        p.route$(p.if(
            () => true,
            p.no()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return NoRoute on true when 'if' router doesn't route and 'else' router exists", (done) =>
        p.route$(p.if(
            () => true,
            p.no(),
            p.do(throwErr)
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should route message to 'if' handler on true predicate when 'else' router doesn't exist", (done) => {
        let routed;

        p.route$(p.if(
            () => true,
            p.do(() => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'if' handler on true predicate when 'else' router exists", (done) => {
        let routed;

        p.route$(p.if(
            () => true,
            p.do(() => {
                routed = true;
            }),
            p.do(throwErr)
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' router on false predicate", (done) => {
        let routed;

        p.route$(p.if(
            () => false,
            p.do(throwErr),
            p.do(() => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should return score=1 on true predicate when 'if' score undefined", (done) => {
        p.if(
            () => true,
            p.do(() => {})
        )
            ()
            .subscribe(route => {
                expect(route.score).to.eql(1);
            }, passErr, done);
    });

    it("should return route score on true predicate", (done) => {
        p.if(
            () => true,
            p.do(() => {}, 0.25)
        )
            ()
            .subscribe(route => {
                expect(route.score).to.eql(.25);
            }, passErr, done);
    });

    it("should return score=1 on false predicate when 'else' score undefined", (done) => {
        p.if(
            () => false,
            p.do(throwErr),
            p.do(m => {})
        )
            ()
            .subscribe(route => {
                expect(route.score).to.eql(1);
            }, passErr, done);
    });

    it("should return 'else' route score on false predicate", (done) => {
        p.if(
            () => false,
            p.do(throwErr),
            p.do(_ => {}, .5)
        )
            ()
            .subscribe(route => {
                expect(route.score).to.eql(.5);
            }, passErr, done);
    });

    it("should throw on string", (done) => {
        p.if(
            () => 'foo',
            p.do(throwErr)
        )
            ()
            .subscribe(throwErr, error => done(), throwErr);
    });

    it("should throw on object", (done) => {
        p.if(
            () => ({ foo: "foo" }),
            p.do(throwErr)
        )
            ()
            .subscribe(throwErr, error => done(), throwErr);
    });

    it("should return a default reason on false", (done) => {
        p.if(
            () => false,
            p.do(throwErr)
        )
            ()
            .subscribe(route => {
                expect(route.reason).to.eql("none");
            }, passErr, done);
    });

    it("should pass supplied reason to 'else' router", (done) => {
        let routed;
        p.if(
            p.no('whatevs'),
            p.do(throwErr),
            p.do(no => {
                routed = no.reason;
            })
        )
            ()
            .subscribe(route => {
                expect(route instanceof p.DoRoute).to.be.true;
                route.action();
                expect(routed).to.eql("whatevs");
            }, passErr, done);
    });

    it("should return supplied reason when 'else' router not supplied", (done) => {
        p.if(
            p.no('whatevs'),
            p.do(throwErr)
        )
            ()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql("whatevs");
            }, passErr, done);
    });

    it("should use formal true value", (done) => {
        let handled;

        p.if(
            p.match(true, .5),
            p.do(m => { handled = true; })
        )
            ()
            .subscribe(route => {
                route.action();
                expect(handled).to.be.true;
                expect(route.score).to.eql(.5);
            }, passErr, done);
    });

    it("should use formal false value", (done) => {
        let handled;

        p.if(
            p.match(false),
            p.do(throwErr)
        )
            ()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done);
    });

    it('should allow undefined result for getThenRouter', (done) =>{
        p.if(
            () => true,
            undefined
        )
            ()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done);
    });

    it('should allow undefined result for getElseRouter', (done) =>{
        p.if(
            () => false,
            throwErr,
            undefined
        )
            ()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done);
    });
});

describe("p.before", () => {
    it("should pass through NoRoute", (done) => {
        p.route$(p.before(
            p.no(),
            throwErr
        )).subscribe(t => {
            expect(t).to.be.false;
        }, passErr, done);
    });

    it("should run 'before' action and then router's action", (done) => {
        let handled = false;
        let routed = false;

        p.route$(p.before(
            p.do(() => {
                expect(handled).to.be.true;
                routed = true;
            }),
            m => {
                expect(routed).to.be.false;
                handled = true;
            }
        ))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe("p.after", () => {
    it("should return false with NoRoute", (done) => {
        p.route$(p.after(
            p.no(),
            throwErr
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done);
    });


    it("should run 'after' handler and then router's action", (done) => {
        let handled = false;
        let routed = false;
    
        p.route$(p.after(
            p.do(m => {
                expect(handled).to.be.false;
                routed = true;
            }),
            m => {
                    expect(routed).to.be.true;
                    handled = true;
                }
        ))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe("p.default", () => {
    it("should not be run when main router returns an action route", (done) => {
        let routed;
    
        p.route$(p.default(
            p.do(m => {
                routed = true;
            }),
            reason => p.do(throwErr)
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should be run when router returns no route", (done) => {
        let handled;

        p.route$(p.default(
            p.no('reason'),
            route => p.do(m => {
                handled = route.reason;
            })
        ))
            .subscribe(n => {
                expect(handled).to.eql('reason');
            }, passErr, done);
    });

    it('should return NoRoute when both router and default router return NoRoute', (done) =>{
        p.default(
            p.no('reason'),
            p.no('another reason')
        )
            ()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql('another reason');
            }, passErr, done);
    });

    it('should allow undefined result for default router', (done) =>{
        p.default(
            p.no('reason'),
            route => undefined
        )
            (foo)
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql('none');
            }, passErr, done);
    });
});

describe('inline Router', () => {
    it("should pass through no route", (done) =>
        p.route$(p.do(() =>
            p.route$(p.no())
        ))
            .subscribe(t => expect(t).to.be.true, passErr, done)
    );

    it("should run handler", (done) => {
        let handled;

        p.route$(p.do(() =>
            p.route$(p.do(() => {
                handled = true;
            }))
        ))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe('p.switch', () => {
    it("doesn't route on undefined key", done => {
        p.route$(p.switch(() => undefined, {
            foo: p.do(throwErr)
        }))
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("doesn't route on null key", done => {
        p.route$(p.switch(() => null, {
            foo: p.do(throwErr)
        }))
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("doesn't route on non-matching key", done => {
        p.route$(p.switch(() => 'bar', {
            foo: p.do(throwErr)
        }))
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("routes matching key", done => {
        let routed = false;
        p.route$(p.switch(() => 'foo', {
            foo: p.do(() => {
                routed = true;
            }),
        }))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("routes matching key when first", done => {
        let routed = false;
        p.route$(p.switch(() => 'foo', {
            foo: p.do(() => {
                routed = true;
            }),
            bar: p.do(throwErr)
        }))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("routes matching key when second", done => {
        let routed = false;
        p.route$(p.switch(() => 'foo', {
            bar: p.do(throwErr),
            foo: p.do(() => {
                routed = true;
            })
        }))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("doesn't route when router for key doesn't route", done => {
        p.route$(p.switch(() => 'foo', {
            foo: p.no()
        }))
            .subscribe(t => {
                expect(t).to.be.false;       
            }, passErr, done);
    });
});
