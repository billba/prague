"use strict";

const chai = require('chai');
chai.use(require('chai-subset'));
const expect = chai.expect;
const Prague = require('../dist/prague.js');
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

describe('Prague.toObservable', () => {
    it("should convert a number to an observable", (done) => {
        Prague.toObservable(5)
            .subscribe(n => {
                expect(n).to.eql(5);
            }, passErr, done);       
    });

    it("should convert a string to an observable", (done) => {
        Prague.toObservable("Prague")
            .subscribe(n => {
                expect(n).to.eql("Prague");
            }, passErr, done);
    });

    it("should convert an array to an observable", (done) => {
        Prague.toObservable([1, 2, 3])
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
            }, passErr, done);       
    });

    it("should convert a Promise<number> to an observable", (done) => {
        Prague.toObservable(Promise.resolve(5))
            .subscribe(n => {
                expect(n).to.eql(5);
            }, passErr, done);       
    });

    it("should convert a Promise<string> to an observable", (done) => {
        Prague.toObservable(Promise.resolve("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
            }, passErr, done);       
    });

    it("should convert a Promise<array> to an observable", (done) => {
        Prague.toObservable(Promise.resolve([1, 2, 3]))
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
            }, passErr, done);       
    });

    it("should convert an Observable<number> to an observable", (done) => {
        Prague.toObservable(Observable.of(5))
            .subscribe(n => {
                expect(n).to.eql(5);
            }, passErr, done);       
    });

    it("should convert an Observable<string> to an observable", (done) => {
        Prague.toObservable(Observable.of("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
            }, passErr, done);       
    });

    it("should convert an Observable<array> to an observable", (done) => {
        Prague.toObservable(Observable.of([1, 2, 3]))
            .subscribe(n => {
                expect(n).to.eql([1, 2, 3]);
            }, passErr, done);       
    });

    it("should convert null to an observable", (done) => {
        Prague.toObservable(null)
            .subscribe(n => {
                expect(n).to.eql(null);
            }, passErr, done);       
    });

    it("should convert undefined to an observable", (done) => {
        Prague.toObservable(undefined)
            .subscribe(n => {
                expect(n).to.eql(undefined);
            }, passErr, done);       
    });

    it("should convert Promise<null> to an observable", (done) => {
        Prague.toObservable(Promise.resolve(null))
            .subscribe(n => {
                expect(n).to.eql(null);
            }, passErr, done);       
    });

    it("should convert Promise<undefined> to an observable", (done) => {
        Prague.toObservable(Promise.resolve(undefined))
            .subscribe(n => {
                expect(n).to.eql(undefined);
            }, passErr, done);       
    });

    it("should convert Observable<null> to an observable", (done) => {
        Prague.toObservable(Observable.of(null))
            .subscribe(n => {
                expect(n).to.eql(null);
            }, passErr, done);       
    });

    it("should convert Observable<undefined> to an observable", (done) => {
        Prague.toObservable(Observable.of(undefined))
            .subscribe(n => {
                expect(n).to.eql(undefined);
            }, passErr, done);       
    });

    it("should complete and never emit on Observable.empty()", (done) => {
        Prague.toObservable(Observable.empty())
            .subscribe(throwErr, passErr, done);       
    });
});

describe('Prague.doRoute', () => {
    it('should create an doRoute with supplied action and no score', () => {
        let action = () => {};
        let route = Prague.doRoute(action);
        expect(route.type).to.eql('do');
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(1);
    });

    it('should create an doRoute with supplied action and score', () => {
        let action = () => {};
        let route = Prague.doRoute(action, 0.5);
        expect(route.type).to.eql('do');
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(.5);
        expect(route.reason).to.be.undefined;
    });
});

describe('Prague.noRoute', () => {
    it('should create a NoRoute with default reason', () => {
        let route = Prague.noRoute();

        expect(route.type).to.eql('no');
        expect(route.reason).to.eql('none');
        expect(route.action).to.be.undefined;
        expect(route.score).to.be.undefined;
    });

    it('should create a NoRoute with supplied reason', () => {
        let route = Prague.noRoute('reason');

        expect(route.type).to.eql('no');
        expect(route.reason).to.eql('reason');
        expect(route.action).to.be.undefined;
        expect(route.score).to.be.undefined;
    });
});

describe('Prague.normalizeRoute', () => {
    it('should normalize undefined', () => {
        let route = Prague.normalizeRoute(undefined);

        expect(route.type).to.eql('no');
        expect(route.reason).to.eql('none');
        expect(route.action).to.be.undefined;
        expect(route.score).to.be.undefined;
    });

    it('should normalize { reason }', () => {
        let route = Prague.normalizeRoute({ reason: 'reason' });

        expect(route.type).to.eql('no');
        expect(route.reason).to.eql('reason');
        expect(route.action).to.be.undefined;
        expect(route.score).to.be.undefined;
    });

    it('should normalize a noRoute without a reason', () => {
        let route = Prague.normalizeRoute(Prague.noRoute());

        expect(route.type).to.eql('no');
        expect(route.reason).to.eql('none');
        expect(route.action).to.be.undefined;
        expect(route.score).to.be.undefined;
    });

    it('should normalize a noRoute with a reason', () => {
        let route = Prague.normalizeRoute(Prague.noRoute('reason'));

        expect(route.type).to.eql('no');
        expect(route.reason).to.eql('reason');
        expect(route.action).to.be.undefined;
        expect(route.score).to.be.undefined;
    });

    it('should normalize an action', () => {
        let action = () => {}
        let route = Prague.normalizeRoute(action);

        expect(route.type).to.eql('do');
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(1);
        expect(route.reason).to.be.undefined;
    });

    it('should normalize { action }', () => {
        let action = () => {}
        let route = Prague.normalizeRoute({ action });

        expect(route.type).to.eql('do');
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(1);
        expect(route.reason).to.be.undefined;
    });

    it('should normalize { action, score }', () => {
        let action = () => {}
        let route = Prague.normalizeRoute({ action, score: .5 });

        expect(route.type).to.eql('do');
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(.5);
        expect(route.reason).to.be.undefined;
    });

    it('should normalize a doRoute without a score', () => {
        let action = () => {}
        let route = Prague.normalizeRoute(Prague.doRoute(action));

        expect(route.type).to.eql('do');
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(1);
        expect(route.reason).to.be.undefined;
    });

    it('should normalize a doRoute with a score', () => {
        let action = () => {}
        let route = Prague.normalizeRoute(Prague.doRoute(action, .5));

        expect(route.type).to.eql('do');
        expect(route.action).to.eql(action);
        expect(route.score).to.eql(.5);
        expect(route.reason).to.be.undefined;
    });
});

describe('Prague.getNormalizedRoute', () => {
    it("should treat undefined as NoRoute", (done) => {
        Observable
            .of(undefined)
            .flatMap(Prague.getNormalizedRoute(foo))
            .subscribe(route => {
                expect(route.type).to.eql('no');
            }, passErr, done)
    });

    it("should not route to NoRoute", (done) => {
        Observable
            .of(Prague.getRouteNo('reason'))
            .flatMap(Prague.getNormalizedRoute(foo))
            .subscribe(route => {
                expect(route.type).to.eql('no');
                expect(route.reason).to.eql('reason');
            }, passErr, done)
    });

    it("should route to supplied route", (done) => {
        Observable
            .of(Prague.getRouteDo(c => {}, .5))
            .flatMap(Prague.getNormalizedRoute(foo))
            .subscribe(route => {
                expect(route.type).to.eql('do');
                expect(route.score).to.eql(.5);
            }, passErr, done)
    });

    it("should route to un-normalized route", (done) => {
        let action =  () => {};

        Observable
            .of(c => action)
            .flatMap(Prague.getNormalizedRoute(foo))
            .subscribe(route => {
                expect(route.type).to.eql('do');
                expect(route.score).to.eql(1);
                expect(route.action).to.eql(action);
            }, passErr, done)
    });
});

describe('Prague.getRouteDo', () => {
    it('should return an doRoute using supplied handler and no score', (done) => {
        let handled;

        Prague.getRouteDo(m => { handled = m; })
            (foo)
            .subscribe(route => {
                expect(route.type).to.eql('do');
                expect(route.score).to.eql(1);
                route.action();
                expect(handled).to.eql(foo);
            }, passErr, done);
    });

    it('should return an doRoute using supplied handler and score', (done) => {
        let handled;
        Prague.getRouteDo(m => { handled = m; }, .5)
            (foo)
            .subscribe(route => {
                expect(route.type).to.eql('do');
                expect(route.score).to.eql(.5);
                route.action();
                expect(handled).to.eql(foo);
            }, passErr, done);
    });
});

describe('Prague.getRouteNo', () => {
    it('should return a NoRoute with the default reason', done => {
        Prague.getRouteNo()
            (foo)
            .subscribe(route => {
                expect(route.type).to.eql('no');
                expect(route.reason).to.eql('none');
            }, passErr, done);
    });

    it('should return a NoRoute with the supplied reason', done => {
        Prague.getRouteNo('reason')
            (foo)
            .subscribe(route => {
                expect(route.type).to.eql('no');
                expect(route.reason).to.eql('reason');
            }, passErr, done);
    });
});

describe('Prague.route$', () => {
    it("should return false on NoRoute", (done) => {
        Prague.route$(foo, Prague.getRouteNo())
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done);
    });

    it("should return true on DoRoute", (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteDo(() => {
            routed = true;
        }))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe('Prague.getRouteFirst', () => {
    it('should return false on no routers', (done) =>
        Prague.route$(foo, Prague.getRouteFirst())
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only null/undefined routers', (done) =>
        Prague.route$(foo, Prague.getRouteFirst(
            null,
            undefined
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only unsuccessful and null/undefined routers', (done) =>
        Prague.route$(foo, Prague.getRouteFirst(
                Prague.getRouteNo(),
                null,
                undefined
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on no successful routers', (done) => {
        Prague.route$(foo, Prague.getRouteFirst(
            Prague.getRouteNo()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    });

    it('should route to a single successful router', (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteFirst(
            Prague.getRouteDo(m => {
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

        Prague.route$(foo, Prague.getRouteFirst(
            null,
            undefined,
            Prague.getRouteDo(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should skip an unsuccessful router and route to a successful router', (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteFirst(
            Prague.getRouteNo(),
            Prague.getRouteDo(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe('Prague.combineScore', () => {
    it("should return combined score", () => {
        expect(Prague.combinedScore(.4, .25)).to.eql(.1);
    });
})

describe('Prague.routeWithCombinedScore', () => {
    it("should return route with combined score", () => {
        expect(Prague.routeWithCombinedScore(
            Prague.doRoute(() => {}, .4),
            .25
        ).score).to.eql(.1);
    });
})

describe('Prague.minRoute', () => {
    it("should have a zero score", () => {
        let route = Prague.minRoute;
        expect(route.score).to.eql(0);
    });
})

describe('Prague.getRouteBest', () => {
    it('should return false on no routers', (done) =>
        Prague.route$(foo, Prague.getRouteBest())
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only null/undefined routers', (done) =>
        Prague.route$(foo, Prague.getRouteBest(
            null,
            undefined
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only unsuccessful and null/undefined routers', (done) =>
        Prague.route$(foo, Prague.getRouteBest(
            Prague.getRouteNo(),
            null,
            undefined
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on no successful routers', (done) => {
        Prague.route$(foo, Prague.getRouteBest(
            Prague.getRouteNo()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    });

    it('should route to a single successful scoreless router', (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteBest(
            Prague.getRouteDo(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should ignore null/undefined routers and route to a successful scoreless router', (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteBest(
            null,
            undefined,
            Prague.getRouteDo(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should skip an unsuccessful router and route to a successful scoreless router', (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteBest(
            Prague.getRouteNo(),
            Prague.getRouteDo(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should return the first route where score=1, never trying the rest', (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteBest(
            Prague.getRouteDo(m => {
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

        Prague.route$(foo, Prague.getRouteBest(
            Prague.getRouteDo(_ => { routed = 'first'; }, 0.75),
            Prague.getRouteDo(_ => { routed = 'second'; }, 0.50)
        ))
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });

    it('should return the higher scoring route when it is second', (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteBest(
            Prague.getRouteDo(_ => { routed = 'first'; }, .5),
            Prague.getRouteDo(_ => { routed = 'second'; }, .75)
        ))
            .subscribe(n => {
                expect(routed).to.eql('second');
            }, passErr, done);
    });

    it('should treat missing scores as 1', (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteBest(
            Prague.getRouteDo(_ => { routed = 'first'; }),
            Prague.getRouteDo(_ => { routed = 'second'; }, .75)
        ))
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });

    it('should return the first of two tied scores', (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteBest(
            Prague.getRouteDo(_ => { routed = 'first'; }, 0.75),
            Prague.getRouteDo(_ => { routed = 'second'; }, 0.75)
        ))
            .subscribe(n => {
                expect(routed).to.eql('first');
            }, passErr, done);
    });
});

describe('Prague.noop', () => {
    it("should execute the handler and return false", (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteNoop(
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

describe('Prague.isMatch', () => {
    it("return true on a match", () => {
        expect(Prague.isMatch({ value: 15 })).to.be.true;
    });

    it("return false on no match", () => {
        expect(Prague.isMatch({ reason: 'yo' })).to.be.false;
    });
});

describe('Prague.getNormalizedMatchResult$', (done) => {
    it("normalizes undefined", () => {
        Prague
            .getNormalizedMatchResult$(m => undefined)
            .subscribe(match => {
                expect(match.value).to.be.undefined;
                expect(match.reason).to.eql('none');
            }, passErr, done);
    });

    it("normalizes false", () => {
        Prague
            .getNormalizedMatchResult$(m => undefined)
            .subscribe(match => {
                expect(match.value).to.be.undefined;
                expect(match.reason).to.eql('none');
            }, passErr, done);
    });

    it("normalizes null", () => {
        Prague
            .getNormalizedMatchResult$(m => undefined)
            .subscribe(match => {
                expect(match.value).to.be.undefined;
                expect(match.reason).to.eql('none');
            }, passErr, done);
    });

    it("normalizes { reason }", () => {
        Prague
            .getNormalizedMatchResult$(m => ({ reason: 'reason' }))
            .subscribe(match => {
                expect(match.reason).to.eql('reason');
                expect(match.value).to.be.undefined;
            }, passErr, done);
    });

    it("normalizes number", () => {
        Prague
            .getNormalizedMatchResult$(m => 15)
            .subscribe(match => {
                expect(match.value).to.eql(15);
                expect(match.score).to.eql(1);
                expect(match.reason).to.be.undefined;
            }, passErr, done);
    });

    it("normalizes object", () => {
        Prague
            .getNormalizedMatchResult$(m => ({ dog: 15 }))
            .subscribe(match => {
                expect(match.value.dog).to.eql(15);
                expect(match.reason).to.be.undefined;
            }, passErr, done);
    });

    it("normalizes { value }", () => {
        Prague
            .getNormalizedMatchResult$(m => ({
                value: 15
            }))
            .subscribe(match => {
                expect(match.value).to.eql(15);
                expect(match.score).to.eql(1);
                expect(match.reason).to.be.undefined;
            }, passErr, done);
    });

    it("normalizes { value, score }", () => {
        Prague
            .getNormalizedMatchResult$(m => ({
                value: 15,
                score: .5
            }))
            .subscribe(match => {
                expect(match.value).to.eql(15);
                expect(match.score).to.eql(.5);
                expect(match.reason).to.be.undefined;
            }, passErr, done);
    });
});


describe('Prague.getRouteIfMatches', () => {
    it("should return false on no match when 'else' router doesn't exist", (done) =>
        Prague.route$(notFoo, Prague.getRouteIfMatches(
            barIfFoo,
            value => Prague.getRouteDo(throwErr)
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on no match when 'else' router doesn't exist", (done) =>
        Prague.route$(notFoo, Prague.getRouteIfMatches(
            barIfFoo,
            value => Prague.getRouteDo(throwErr)
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on no match when 'else' router doesn't route", (done) =>
        Prague.route$(notFoo, Prague.getRouteIfMatches(
            barIfFoo,
            value => Prague.getRouteDo(throwErr),
            route => Prague.getRouteNo()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on match when 'if' router doesn't route and 'else' router exists", (done) =>
        Prague.route$(foo, Prague.getRouteIfMatches(
            barIfFoo,
            value => Prague.getRouteNo(),
            route => Prague.getRouteDo(throwErr)
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should route message to 'if' handler on match when 'else' router doesn't exist", (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteIfMatches(
            barIfFoo,
            value => Prague.getRouteDo(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'if' handler on match when 'else' router exists", (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteIfMatches(
            barIfFoo,
            value => Prague.getRouteDo(m => {
                routed = true;
            }),
            route => Prague.getRouteDo(throwErr)
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' handler on no match", (done) => {
        let routed;

        Prague.route$(notFoo, Prague.getRouteIfMatches(
            barIfFoo,
            value => Prague.getRouteDo(throwErr),
            route => Prague.getRouteDo(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' router on no match", (done) => {
        let routed;

        Prague.route$(notFoo, Prague.getRouteIfMatches(
            c => ({ reason: 'reason' }),
            value => Prague.getRouteDo(throwErr),
            route => Prague.getRouteDo(m => {
                routed = route.reason;
            })
        ))
            .subscribe(n => {
                expect(routed).to.eql('reason');
            }, passErr, done);
    });

    it("should pass value to 'then' router on match", (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteIfMatches(
            c => ({ value: 'value' }),
            value => Prague.getRouteDo(c => {
                routed = value;
            }),
            route => Prague.getRouteDo(throwErr)
        ))
            .subscribe(n => {
                expect(routed).to.eql('value');
            }, passErr, done);
    });

    it("should pass value to 'then' handler on match", (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteIfMatches(
            c => ({ value: 'value' }),
            value => Prague.getRouteDo(() => {
                routed = value;
            }),
            route => Prague.getRouteDo(throwErr)
        ))
            .subscribe(n => {
                expect(routed).to.eql('value');
            }, passErr, done);
    });

    it("should return score=1 when score not supplied", (done) => {
        Prague.getRouteIfMatches(
            barIfFoo,
            value => Prague.getRouteDo(m => {})
        )
            (foo)
            .subscribe(route => {
                expect(route.score).to.eql(1);
                done();
            })
    });

    it("should return supplied score", (done) => {
        Prague.getRouteIfMatches(
            m => ({ value: 'dog', score: 0.4 }),
            value => Prague.getRouteDo(m => {})
        )
            (foo)
            .subscribe(route => {
                expect(route.score).to.eql(.4);
            }, passErr, done);
    });

    it("should pass supplied value to handler", (done) => {
        let handled;
        Prague.route$(foo, Prague.getRouteIfMatches(
            m => ({ value: 'dog' }),
            value => Prague.getRouteDo(() => {
                handled = value;
            })
        ))
            .subscribe(_ => {
                expect(handled).to.eql('dog');
            }, passErr, done);
    });

    it("should return combined score when route score supplied", (done) => {
        Prague.getRouteIfMatches(
            barIfFoo,
            value => Prague.getRouteDo(() => {}, .25)
        )
            (foo)
            .subscribe(route => {
                expect(route.score).to.eql(.25);
            }, passErr, done);
    });

    it("should return combined score when both scores supplied", (done) => {
        Prague.getRouteIfMatches(
            m => ({ value: 'cat', score: 0.4 }),
            value => Prague.getRouteDo(() => {}, .25)
        )
            (foo)
            .subscribe(route => {
                expect(route.score).to.eql(.1);
            }, passErr, done);
    });

    it("should return 'else' route score on no match", (done) => {
        Prague.getRouteIfMatches(
            barIfFoo,
            value => Prague.getRouteDo(throwErr),
            route => Prague.getRouteDo(() => {}, .5)
        )
            (notFoo)
            .subscribe(route => {
                expect(route.score).to.eql(.5);
            }, passErr, done);
    });
});

describe("Prague.predicateToMatcher", () => {
    it("should pass through true", (done) => {
        Prague.predicateToMatcher(m => true)
            (foo)
            .subscribe(response => {
                expect(response).to.be.true;
            }, passErr, done);
    });

    it("should pass through true", (done) => {
        Prague.predicateToMatcher(m => false)
            (foo)
            .subscribe(response => {
                expect(response).to.be.false;
            }, passErr, done);
    });

    it("should throw on object", (done) => {
        Prague.predicateToMatcher(m => ({ dog: "reason"}))
            (foo)
            .subscribe(throwErr, error => done(), throwErr);
    });

    it("should throw on number", (done) => {
        Prague.predicateToMatcher(m => 15)
            (foo)
            .subscribe(throwErr, error => done(), throwErr);
        });

    it("should pass through { value: true }", (done) => {
        Prague.predicateToMatcher(m => ({ value: true }))
            (foo)
            .subscribe(response => {
                expect(response.value).to.be.true;
            }, passErr, done);
    });

    it("should treat { value: false } as false", (done) => {
        Prague.predicateToMatcher(m => ({ value: false }))
            (foo)
            .subscribe(response => {
                expect(response).to.be.false;
            }, passErr, done);
    });

});


describe('Prague.getRouteIfTrue', () => {
    it("should return false on false when 'else' router doesn't exist", (done) =>
        Prague.route$(foo, Prague.getRouteIfTrue(
            m => false,
            Prague.getRouteDo(throwErr)
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on false when 'else' router doesn't route", (done) =>
        Prague.route$(foo, Prague.getRouteIfTrue(
            m => false,
            Prague.getRouteDo(throwErr),
            route => Prague.getRouteNo()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on true when 'if' router doesn't route and 'else' router doesn't exist", (done) =>
        Prague.route$(foo, Prague.getRouteIfTrue(
            m => true,
            Prague.getRouteNo()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on true when 'if' router doesn't route and 'else' router exists", (done) =>
        Prague.route$(foo, Prague.getRouteIfTrue(
            m => true,
            Prague.getRouteNo(),
            route => Prague.getRouteDo(throwErr)
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should route message to 'if' handler on true predicate when 'else' router doesn't exist", (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteIfTrue(
            m => true,
            Prague.getRouteDo(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'if' handler on true predicate when 'else' router exists", (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteIfTrue(
            m => true,
            Prague.getRouteDo(m => {
                routed = true;
            }),
            route => Prague.getRouteDo(throwErr)
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' router on false predicate", (done) => {
        let routed;

        Prague.route$(foo, Prague.getRouteIfTrue(
            m => false,
            Prague.getRouteDo(throwErr),
            route => Prague.getRouteDo(m => {
                routed = true;
            })
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should return score=1 on true predicate when 'if' score undefined", (done) => {
        Prague.getRouteIfTrue(
            m => true,
            Prague.getRouteDo(m => {})
        )
            (foo)
            .subscribe(route => {
                expect(route.score).to.eql(1);
            }, passErr, done);
    });

    it("should return route score on true predicate", (done) => {
        Prague.getRouteIfTrue(
            m => true,
            Prague.getRouteDo(() => {}, 0.25)
        )
            (foo)
            .subscribe(route => {
                expect(route.score).to.eql(.25);
            }, passErr, done);
    });

    it("should return score=1 on false predicate when 'else' score undefined", (done) => {
        Prague.getRouteIfTrue(
            m => false,
            Prague.getRouteDo(throwErr),
            route => Prague.getRouteDo(m => {})
        )
            (foo)
            .subscribe(route => {
                expect(route.score).to.eql(1);
            }, passErr, done);
    });

    it("should return 'else' route score on false predicate", (done) => {
        Prague.getRouteIfTrue(
            m => false,
            Prague.getRouteDo(throwErr),
            route => Prague.getRouteDo(_ => {}, .5)
        )
            (foo)
            .subscribe(route => {
                expect(route.score).to.eql(.5);
            }, passErr, done);
    });

    it("should throw on string", (done) => {
        Prague.getRouteIfTrue(
            m => 'foo',
            Prague.getRouteDo(throwErr)
        )
            (foo)
            .subscribe(throwErr, error => {
                done();
            }, throwErr);
    });

    it("should throw on object", (done) => {
        Prague.getRouteIfTrue(
            m => ({ foo: "foo" }),
            Prague.getRouteDo(throwErr)
        )
            (foo)
            .subscribe(throwErr, error => {
                done();
            }, throwErr);
    });

    it("should return a default reason on false", (done) => {
        Prague.getRouteIfTrue(
            m => false,
            Prague.getRouteDo(throwErr)
        )
            (foo)
            .subscribe(route => {
                expect(route.reason).to.eql("none");
            }, passErr, done);
    });

    it("should pass supplied reason to 'else' router", (done) => {
        let routed;
        Prague.getRouteIfTrue(
            m => ({ reason: 'whatevs' }),
            Prague.getRouteDo(throwErr),
            route => Prague.getRouteDo(m => {
                routed = route.reason;
            })
        )
            (foo)
            .subscribe(route => {
                expect(route.type === 'do');
                route.action();
                expect(routed).to.eql("whatevs");
            }, passErr, done);
    });

    it("should return supplied reason when 'else' router not supplied", (done) => {
        Prague.getRouteIfTrue(
            m => ({ reason: 'whatevs' }),
            Prague.getRouteDo(throwErr)
        )
            (foo)
            .subscribe(route => {
                expect(route.type).to.eql('no');
                expect(route.reason).to.eql("whatevs");
            }, passErr, done);
    });

    it("should use formal true value", (done) => {
        let handled;

        Prague.getRouteIfTrue(
            m => ({ value: true, score: .5 }),
            Prague.getRouteDo(m => { handled = true; })
        )
            (foo)
            .subscribe(route => {
                route.action();
                expect(handled).to.be.true;
                expect(route.score).to.eql(.5);
            }, passErr, done);
    });

    it("should use formal false value", (done) => {
        let handled;

        Prague.getRouteIfTrue(
            m => ({ value: false }),
            Prague.getRouteDo(throwErr)
        )
            (foo)
            .subscribe(route => {
                expect(route.type).to.eql('no')
            }, passErr, done);
    });

    it('should allow undefined result for getThenRouter', (done) =>{
        Prague.getRouteIfTrue(
            c => true,
            undefined
        )
            (foo)
            .subscribe(route => {
                expect(route.type).to.eql('no')
            }, passErr, done);
    });

    it('should allow undefined result for getElseRouter', (done) =>{
        Prague.getRouteIfTrue(
            c => false,
            throwErr,
            route => undefined
        )
            (foo)
            .subscribe(route => {
                expect(route.type).to.eql('no')
            }, passErr, done);
    });

});

describe("Prague.getRouteBefore", () => {
    it("should return false with Prague.noRoute()", (done) => {
        Prague.route$(foo, Prague.getRouteBefore(
            throwErr,
            Prague.getRouteNo()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done);
    });


    it("should run 'before' handler and then router's action", (done) => {
        let handled = false;
        let routed = false;
    
        Prague.route$(foo, Prague.getRouteBefore(
            m => {
                expect(routed).to.be.false;
                handled = true;
            },
            Prague.getRouteDo(m => {
                expect(handled).to.be.true;
                routed = true;
            })
        ))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe("Prague.getRouteBefore", () => {
    it("should return false with Prague.noRoute()", (done) => {
        Prague.route$(foo, Prague.getRouteAfter(
            throwErr,
            Prague.getRouteNo()
        ))
            .subscribe(t => expect(t).to.be.false, passErr, done);
    });


    it("should run 'after' handler and then router's action", (done) => {
        let handled = false;
        let routed = false;
    
        Prague.route$(foo, Prague.getRouteAfter(
            m => {
                expect(routed).to.be.true;
                handled = true;
            },
            Prague.getRouteDo(m => {
                expect(handled).to.be.false;
                routed = true;
            })
        ))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe("Prague.getRouteDefault", () => {
    it("should not be run when main router returns an action route", (done) => {
        let routed;
    
        Prague.route$(foo, Prague.getRouteDefault(
            Prague.getRouteDo(m => {
                routed = true;
            }),
            reason => Prague.getRouteDo(throwErr)
        ))
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should be run when router returns no route", (done) => {
        let handled;

        Prague.route$(foo, Prague.getRouteDefault(
            Prague.getRouteNo('reason'),
            route => Prague.getRouteDo(m => {
                handled = route.reason;
            })
        ))
            .subscribe(n => {
                expect(handled).to.eql('reason');
            }, passErr, done);
    });

    it('should allow undefined result for getDefaultRouter', (done) =>{
        Prague.getRouteDefault(
            Prague.getRouteNo('reason'),
            route => undefined
        )
            (foo)
            .subscribe(route => {
                expect(route.type).to.eql('no');
                expect(route.reason).to.eql('none');
            }, passErr, done);
    });
});

describe('inline Router', () => {
    it("should pass through no route", (done) =>
        Prague.route$(foo, Prague.getRouteDo(c =>
            Prague.route$(c, Prague.getRouteNo())
        ))
            .subscribe(t => expect(t).to.be.true, passErr, done)
    );

    it("should run handler", (done) => {
        let handled;

        Prague.route$(foo, Prague.getRouteDo(c =>
            Prague.route$(c, Prague.getRouteDo(c => {
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
        Prague.route$(foo, Prague.getRouteSwitch(
            c => undefined, {
                foo: Prague.getRouteDo(throwErr)
            }
        ))
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("doesn't route on null key", done => {
        Prague.route$(foo, Prague.getRouteSwitch(
            c => undefined, {
                foo: Prague.getRouteDo(throwErr)
            }
        ))
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("doesn't route on non-matching key", done => {
        Prague.route$(foo, Prague.getRouteSwitch(
            c => 'bar', {
                foo: Prague.getRouteDo(throwErr)
            }
        ))
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("routes matching key", done => {
        let routed = false;
        Prague.route$(foo, Prague.getRouteSwitch(
            c => 'foo', {
                foo: Prague.getRouteDo(c => {
                    routed = true;
                }),
            }
        ))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("routes matching key when first", done => {
        let routed = false;
        Prague.route$(foo, Prague.getRouteSwitch(
            c => 'foo', {
                foo: Prague.getRouteDo(c => {
                    routed = true;
                }),
                bar: Prague.getRouteDo(throwErr)
            }
        ))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("routes matching key when second", done => {
        let routed = false;
        Prague.route$(foo, Prague.getRouteSwitch(
            c => 'foo', {
                bar: Prague.getRouteDo(throwErr),
                foo: Prague.getRouteDo(c => {
                    routed = true;
                })
            }
        ))
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("doesn't route when router for key doesn't route", done => {
        Prague.route$(foo, Prague.getRouteSwitch(
            c => 'foo', {
                foo: Prague.getRouteNo()
            }
        ))
            .subscribe(t => {
                expect(t).to.be.false;       
            }, passErr, done);
    });

    it("conditionally routes", done => {
        let routed;
        Prague.route$(foo, Prague.getRouteSwitch(
            c => 'foo', {
                foo: Prague.getRouteIfTrue(
                    c => c.foo === 'foo',
                    Prague.getRouteDo(c => {
                        routed = true;
                    }),
                    reason => Prague.getRouteDo(throwErr)
                )
            }
        ))
            .subscribe(t => {
                expect(t).to.be.true;  
                expect(routed).to.be.true;     
            }, passErr, done);
    });
});
