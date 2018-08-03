"use strict";

const chai = require('chai');
chai.use(require('chai-subset'));
const expect = chai.expect;
const p = require('../lib/prague.js');
const { of, empty } = require('rxjs');

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
        p.toObservable(of(5))
            .subscribe(n => {
                expect(n).to.eql(5);
            }, passErr, done);       
    });

    it("should convert an Observable<string> to an observable", (done) => {
        p.toObservable(of("Prague"))
            .subscribe(n => {
                expect(n).to.eql("Prague");
            }, passErr, done);       
    });

    it("should convert an Observable<array> to an observable", (done) => {
        p.toObservable(of([1, 2, 3]))
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
        p.toObservable(of(null))
            .subscribe(n => {
                expect(n).to.eql(null);
            }, passErr, done);       
    });

    it("should convert Observable<undefined> to an observable", (done) => {
        p.toObservable(of(undefined))
            .subscribe(n => {
                expect(n).to.eql(undefined);
            }, passErr, done);       
    });

    it("should complete and never emit on Observable.empty()", (done) => {
        p.toObservable(empty())
            .subscribe(throwErr, passErr, done);       
    });
});

describe('new p.Do', () => {
    it('should create a Do with supplied action ', (done) => {
        let handled;
        let action = () => { handled = true; };
        let route = new p.Do(action);
        expect(route instanceof p.Do).to.be.true;
        route
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe('p.No', () => {
    it('should create a No with default reason', () => {
        let route = new p.No();

        expect(route instanceof p.No).to.be.true;
        expect(route.reason).to.eql('none');
    });

    it('should create a No with supplied reason', () => {
        let route = new p.No('reason');

        expect(route instanceof p.No).to.be.true;
        expect(route.reason).to.eql('reason');
    });
});

describe('p.do', () => {
    it('should return a function returning Do using supplied action', (done) => {
        let handled;
        let route = p
            .do(m => { handled = m; })
            .tap(route => {
                expect(route instanceof p.Do).to.be.true;
            })
            .do$(foo)
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.eql(foo);
            }, passErr, done);
    });
});

describe('p.no', () => {
    it('should return a No with the default reason', (done) => {
        let route = p
            .no()
            .route$(foo)
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
                expect(route.reason).to.eql('none');
            }, passErr, done);
    });

    it('should return a No with the supplied reason', (done) => {
        let route = p
            .no('reason')
            .route$(foo)
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
                expect(route.reason).to.eql('reason');
            }, passErr, done);
    });
});

describe('new p.Match', () => {
    it('should return a Match with the supplied value', () => {
        let route = new p.Match("hello");
        expect(route instanceof p.Match).to.be.true;
        expect(route.value).to.eql('hello');
    });
});

describe('p.NamedAction', () => {
    it('should create a NamedAction with no arg', () => {
        let route = new p.NamedAction('foo');

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.be.eql([]);
        expect(route.score).to.eql(1);
        expect(route.source).to.be.undefined;
    });

    it('should create a NamedAction with arg', () => {
        let route = new p.NamedAction('foo', "hello");

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello"]);
        expect(route.score).to.eql(1);
        expect(route.source).to.be.undefined;
    });

    it('should create a NamedAction with multiple args', () => {
        let route = new p.NamedAction('foo', "hello", "goodbye");

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello", "goodbye"]);
        expect(route.score).to.eql(1);
        expect(route.source).to.be.undefined;
    });

    it('should create a NamedAction using NamedActionOptions and no args', () => {
        let route = new p.NamedAction({
            name: 'foo',
         });

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql([]);
        expect(route.source).to.be.undefined;
    });

    it('should create a NamedAction using NamedActionOptions and arg', () => {
        let route = new p.NamedAction({
            name: 'foo',
         }, "hello");

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello"]);
        expect(route.source).to.be.undefined;
    });

    it('should create a NamedAction using NamedActionOptions and multiple args', () => {
        let route = new p.NamedAction({
            name: 'foo',
         }, "hello", "goodbye");

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello", "goodbye"]);
        expect(route.source).to.be.undefined;
    });

    it('should create a NamedAction with score', () => {
        let route = new p.NamedAction({
            name: 'foo',
            score: .5
         }, "hello");

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello"]);
        expect(route.score).to.eql(.5);
        expect(route.source).to.be.undefined;
    });

    it('should create a NamedAction with source', () => {
        let route = new p.NamedAction({
            name: 'foo',
            source: "source",
        }, "hello");

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello"]);
        expect(route.source).to.eql("source");
        expect(route.score).to.eql(1);
        
    });

    it('should create a NamedAction with source and score', () => {
        let route = new p.NamedAction({
            name: 'foo',
            score: .5,
            source: "source",
         }, "hello");

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello"]);
        expect(route.source).to.eql("source");
        expect(route.score).to.eql(.5);
    });
})

describe('p.NamedActions.route', () => {
    let namedActions = new p.NamedActions({
        foo: (a) => {}
    });

    it('should return a NamedAction with the supplied value', () => {
        let route = namedActions.route('foo', "hello");

        expect(route.name).to.eql("foo"); 
        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello"]);
        expect(route.score).to.eql(1);
        expect(route.source).to.be.undefined;
    });

    it('should return a NamedAction with the supplied value and score', () => {
        let route = namedActions.route({
            name: 'foo',
            score: .5,
        }, "hello");

        expect(route.name).to.eql("foo"); 
        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello"]);
        expect(route.score).to.eql(.5);
        expect(route.source).to.be.undefined;
    });

    it('should return a NamedAction with the supplied value and source', () => {
        let route = namedActions.route({
            name: 'foo',
            source: "hello",
         }, "hello");

        expect(route.name).to.eql("foo"); 
        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello"]);
        expect(route.score).to.eql(1);
        expect(route.source).to.eql("hello");
    });

    it('should return a NamedAction with the supplied value, source, and score', () => {
        let route = namedActions.route({
            name: 'foo',
            source: "hello",
            score: .5,
         }, "hello");

        expect(route.name).to.eql("foo"); 
        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql("foo");
        expect(route.args).to.eql(["hello"]);
        expect(route.score).to.eql(.5);
        expect(route.source).to.eql("hello");
    });
});

describe('p.NamedActions.router', () => {
    let namedActions = new p.NamedActions({
        foo: (a) => {}
    });

    it('should return a NamedAction with the supplied value', (done) => {
        namedActions
            .router('foo', "hello")
            .route$()
            .subscribe(route => {
                expect(route.name).to.eql("foo"); 
                expect(route instanceof p.NamedAction).to.be.true;
                expect(route.name).to.eql("foo");
                expect(route.args).to.eql(["hello"]);
                expect(route.score).to.eql(1);
                expect(route.source).to.be.undefined;
            }, passErr, done);
    });

    it('should return a NamedAction with the supplied value and score', (done) => {
        namedActions
            .router({
                name: 'foo',
                score: .5,
             }, "hello")
            .route$()
            .subscribe(route => {
                expect(route.name).to.eql("foo"); 
                expect(route instanceof p.NamedAction).to.be.true;
                expect(route.name).to.eql("foo");
                expect(route.args).to.eql(["hello"]);
                expect(route.score).to.eql(.5);
                expect(route.source).to.be.undefined;
            }, passErr, done);
    });

    it('should return a NamedAction with the supplied value and source', (done) => {
        namedActions
            .router({
                name: 'foo',
                source: "hello",
             }, "hello")
            .route$()
            .subscribe(route => {
                expect(route.name).to.eql("foo"); 
                expect(route instanceof p.NamedAction).to.be.true;
                expect(route.name).to.eql("foo");
                expect(route.args).to.eql(["hello"]);
                expect(route.score).to.eql(1);
                expect(route.source).to.eql("hello");
            }, passErr, done);
    });
    
    it('should return a NamedAction with the supplied value, source, and score', (done) => {
        namedActions
            .router({
                name: 'foo',
                score: .5,
                source: "hello",
             }, "hello")
            .route$()
            .subscribe(route => {
                expect(route.name).to.eql("foo"); 
                expect(route instanceof p.NamedAction).to.be.true;
                expect(route.name).to.eql("foo");
                expect(route.args).to.eql(["hello"]);
                expect(route.score).to.eql(.5);
                expect(route.source).to.eql("hello");
            }, passErr, done);
    });
});

describe('router.mapNamedActions', () => {
    it('should map a namedAction with no context', (done) => {
        let handled;

        let namedActions = new p.NamedActions(() => ({
            foo: (value) => { handled = value; }
        }));

        let route = namedActions.route('foo', "hello");
        
        p.Router
            .from(() => route)
            .mapNamedActions(namedActions)
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.eql('hello');
            }, passErr, done);
    });

    it('should map a namedAction with context arg', (done) => {
        let handled;

        let namedActions = new p.NamedActions(c => ({
            foo: (value) => { handled = value + c; }
        }));

        let route = namedActions.route('foo', "hello");

        p.Router
            .from(() => route)
            .mapNamedActions(namedActions, " world")
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.eql('hello world');
            }, passErr, done);
    });

    it('should map a namedAction with multiple context args', (done) => {
        let handled;

        let namedActions = new p.NamedActions((c, d) => ({
            foo: (value) => { handled = value + c + d; }
        }));

        let route = namedActions.route('foo', "hello");

        p.Router
            .from(() => route)
            .mapNamedActions(namedActions, " world", ", you crazy place")
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.eql('hello world, you crazy place');
            }, passErr, done);
    });

    it('should throw on an unknown action', (done) => {
        let handled;

        let namedActions = new p.NamedActions(() => {
            foo: value => { handled = value; }
        });

        let route = new p.NamedAction('bar', "hello");

        p.Router
            .from(() => route)
            .mapNamedActions(namedActions)
            .do$()
            .subscribe(throwErr, passErr => done(), throwErr);
    });
});

describe('p.Multiple', () => {
    it('should create a Multiple', () => {
        let routeA = new p.NamedAction({
            name: 'foo',
            score: .5,
        }, "hello");
        let routeB = new p.NamedAction({
            name: 'bar',
            score: .7,
         }, "goodbye");

        let route = new p.Multiple([
            routeA,
            routeB
        ]);

        expect(route instanceof p.Multiple).to.be.true;
        expect(route.routes[0]).to.eql(routeA);
        expect(route.routes[1]).to.eql(routeB);
        expect(JSON.stringify(route)).to.eql(`{"routes":[{"score":0.5,"name":"foo","args":["hello"]},{"score":0.7,"name":"bar","args":["goodbye"]}]}`);
    });
})

describe('new Router', () => {
    it('should create a Router returning No when no router supplied', done => {
        new p.Router()
            .route$()
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
            }, passErr, done);
    });

    it('should copy the route$ from a Router', () => {
        let handled;
        let router = p.do(() => { handled = true; });
        let r = new p.Router(router);
        expect(r.route$).to.eql(router.route$);
    });

    it('should create a Router from a Do', (done) => {
        let handled;
        let router = () => new p.Do(() => { handled = true; });
        let r = new p.Router(router);
        
        expect(r).not.to.eql(router);
        r
            .tap(route => {
                expect(route instanceof p.Do).to.be.true;
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done)
    });

    it('should throw on non-Router, non-function', () => {
        expect(() => new p.Router("hello")).throws;
    });

    it('should create a Router returning Match from arg => value', (done) => {
        let handled;
        let router = (arg) => "hi";
        new p.Router(router)
            .route$(foo)
            .subscribe(route => {
                expect(route instanceof p.Match).to.be.true;
                expect(route.value).to.eql("hi");
            }, passErr, done)
    });

    it('should create a Router returning No from arg => undefined', (done) => {
        let handled;
        let router = (arg) => {};
        new p.Router(router)
            .route$(foo)
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
            }, passErr, done)
    });

    it("should create a Router returning No from { result: reason }", done => {
        new p.Router(() => ({ reason: 'reason' }))
            .route$(foo)
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
                expect(route.reason).to.eql('reason');
            }, passErr, done)
    });

    it("should create a Router returning Match from { value: 'value' }", done => {
        new p.Router(() => ({ value: 'value' }))
            .route$(foo)
            .subscribe(route => {
                expect(route instanceof p.Match).to.be.true;
                expect(route.value).to.eql('value');
                expect(route.score).to.eql(1);
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
        let router = () => new p.Do(() => { handled = true; });
        let r = p.Router.from(router);
        
        expect(r).not.to.eql(router);
        r
            .tap(route => {
                expect(route instanceof p.Do).to.be.true;
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done)
    });

});

describe('router.do$', () => {
    it("should return false on No with no arg", (done) => {
        p
            .no()
            .do$()
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done);
    });

    it("should return false on No with arg", (done) => {
        p
            .no()
            .do$(foo)
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done);
    });

    it("should return true on Do with no arg", (done) => {
        let routed;

        p
            .do(() => {
                routed = true;
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should return true on Do with arg", (done) => {
        let routed;

        p
            .do(() => {
                routed = true;
            })
            .do$(foo)
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should return true on Do, passing arg to action", (done) => {
        let routed;

        p
            .do(m => {
                routed = m;
            })
            .do$(foo)
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.eql(foo);
            }, passErr, done);
    });

    it("should throw on NamedAction", (done) => {
        p
            .Router
            .from(() => new p.NamedAction('foo', {}))
            .do$()
            .subscribe(throwErr, passErr => done(), throwErr);
    });

    it("should throw on Match", (done) => {
        p
            .Router
            .from(() => new p.Match('foo'))
            .do$()
            .subscribe(throwErr, passErr => done(), throwErr);
    });

});

describe('router.mapMultiple', () => {
    let routeA = new p.NamedAction({
        name: 'foo',
        source: "foo",
        score: .5
    });
    let routeB = new p.NamedAction({
        name: 'bar',
        source: "bar",
        score: .5
    });

    let route = new p.Multiple([routeA, routeB]);

    it('should return the first of two tied routes', (done) => {
        p.Router
            .from(() => route)
            .mapMultiple(route => route.routes[0])
            .route$()
            .subscribe(route => {
                expect(route).to.eql(routeA);
            }, passErr, done)
    });

    it('should return the second of two tied routes', (done) => {
        p.Router
            .from(() => route)
            .mapMultiple(route => route.routes[1])
            .route$()
            .subscribe(route => {
                expect(route).to.eql(routeB);
            }, passErr, done)
    });

})

describe('p.first', () => {
    it('should return false on no routers', (done) =>
        p
            .first()
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only null/undefined routers', (done) =>
        p
            .first(
                null,
                undefined
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on only unsuccessful and null/undefined routers', (done) =>
        p
            .first(
                p.no(),
                null,
                undefined
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it('should return false on no successful routers', (done) => {
        p
            .first(
                p.no()
            )
            .do$()
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
            .do$()
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
            .do$()
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
            .do$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it('should pass value through to routers', (done) => {
        let routed;

        p
            .first(
                p.no(),
                p.do(m => {
                    routed = m;
                }),
            )
            .do$("hello")
            .subscribe(n => {
                expect(routed).to.be.eql("hello");
            }, passErr, done);
    });
});

describe('scored.combinedScore', () => {
    it("should return combined score", () => {
        expect(p.Scored.combinedScore(.4, .25)).to.eql(.1);
    });
})

describe('namedAction.cloneWithScore', () => {
    let original = new p.NamedAction({
        name: 'foo',
        score: .4,
     });

    it("should return original route when supplied score matches route score", () => {
        let route = original.cloneWithScore(.4);

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route).to.eql(original);
    });

    it("should return route with supplied score", () => {
        let route = original.cloneWithScore(.25);

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route.name).to.eql('foo');
        expect(route.score).to.eql(.25);
    });
});

describe('namedAction.cloneWithCombinedScore', () => {
    let original = new p.NamedAction({
        name: 'foo',
        score: .4,
    });

    it("should return original route when score to be combined is 1", () => {
        let route = original.cloneWithCombinedScore();

        expect(route instanceof p.NamedAction).to.be.true;        
        expect(route).to.eql(original);
    });

    it("should return new route when score to be combined is not 1", () => {
        let route = original.cloneWithCombinedScore(.25);

        expect(route instanceof p.NamedAction).to.be.true;
        expect(route).to.not.eql(original);
        expect(route.name).to.eql('foo');
        expect(route.score).to.eql(.1);
    });
})

describe('p.best', () => {
    it('should return No on no routers', (done) => {
        p
            .best()
            .route$()
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
            }, passErr, done)
    });

    it('should return No on only null/undefined routers', (done) =>
        p
            .best(
                null,
                undefined
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
            }, passErr, done)
    );

    it('should return No on only unsuccessful and null/undefined routers', (done) =>
        p
            .best(
                p.no(),
                null,
                undefined
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
            }, passErr, done)
    );

    it('should return No on no successful routers', (done) => {
        p
            .best(
                p.no()
            )
            .route$()        
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
            }, passErr, done)
    });

    it('should route to a single successful scoreless router', (done) => {
        let r = new p.NamedAction('foo');

        p
            .best(
                () => r
            )
            .route$()            
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done);
    });

    it('should ignore null/undefined routers and route to a successful scoreless router', (done) => {
        let r = new p.NamedAction('foo');

        p
            .best(
                null,
                undefined,
                () => r
            )
            .route$()            
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done);
    });

    it('should skip an unsuccessful router and route to a successful scoreless router', (done) => {
        let r = new p.NamedAction('foo');
        
        p
            .best(
                p.no(),
                () => r
            )
            .route$()            
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done);
    });


    it('should return the higher scoring route when it is first', (done) => {
        p
            .best(
                () => new p.NamedAction({
                    name: 'foo', 
                    score: .75
                }),
                () => new p.NamedAction({
                    name: 'bar',
                    score: .5
                })
            )
            .route$()            
            .subscribe(route => {
                expect(route.name).to.eql('foo');
                expect(route.score).to.eql(.75);
            }, passErr, done);
    });

    it('should return the higher scoring route when it is second', (done) => {
        p
            .best(
                () => new p.NamedAction({
                    name: 'bar',
                    score: .5
                }),
                () => new p.NamedAction({
                    name: 'foo', 
                    score: .75
                }),
            )
            .route$()            
            .subscribe(route => {
                expect(route.name).to.eql('foo');
                expect(route.score).to.eql(.75);
            }, passErr, done);
    });

    it('should return two tied scores as a Multiple', (done) => {
        let routeA = new p.NamedAction({
            name: 'foo',
            source: "foo",
            score: .5
        });

        let routeB = new p.NamedAction({
            name: 'bar',
            source: "bar",
            score: .5
        });

        p
            .best(
                () => routeA,
                () => routeB
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.Multiple).to.be.true;
                expect(route.routes[0]).to.eql(routeA);
                expect(route.routes[0].source).to.eql("foo");
                expect(route.routes[1]).to.eql(routeB);
                expect(route.routes[1].source).to.eql("bar");
            }, passErr, done);
    });

    it('should return two tied high scores as a Multiple', (done) => {
        let routeA = new p.NamedAction({
            name: 'foo',
            score: .5
        });
        let routeB = new p.NamedAction({
            name: 'bar',
            score: .5
        });
        let routeC = new p.NamedAction({
            name: 'foobar',
            score: .5
        });

        p
            .best(
                () => routeA,
                () => routeB,
                () => routeC
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.Multiple).to.be.true;
                expect(route.routes[0]).to.eql(routeA);
                expect(route.routes[1]).to.eql(routeB);
            }, passErr, done);
    });

    it('should return two tied high scores as a Multiple (different order)', (done) => {
        let routeA = new p.NamedAction({
            name: 'foo',
            score: .5
        });
        let routeB = new p.NamedAction({
            name: 'bar',
            score: .5
        });
        let routeC = new p.NamedAction({
            name: 'foobar',
            score: .4
        });

        p
            .best(
                () => routeA,
                () => routeC,
                () => routeB
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.Multiple).to.be.true;
                expect(route.routes[0]).to.eql(routeA);
                expect(route.routes[1]).to.eql(routeB);
            }, passErr, done);
    });

    it('should return two tolerance-tied high scores as a Multiple', (done) => {
        let routeA = new p.NamedAction({
            name: 'foo',
            score: .5
        });
        let routeB = new p.NamedAction({
            name: 'bar',
            score: .4
        });
        let routeC = new p.NamedAction({
            name: 'foobar',
            score: .2
        });

        p
            .best(
                .1,
                () => routeA,
                () => routeB,
                () => routeC
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.Multiple).to.be.true;
                expect(route.routes[0]).to.eql(routeA);
                expect(route.routes[1]).to.eql(routeB);
            }, passErr, done);
    });

    it('should pass value through to routers', (done) => {
        p
            .best(
                m => new p.NamedAction(m),
            )
            .route$("hello")
            .subscribe(route => {
                expect(route.name).to.eql("hello");
            }, passErr, done);
    })
});

describe('p.noop', () => {
    it("should execute the handler and return false", (done) => {
        let routed;

        p
            .noop(
                () => {
                    routed = true;
                }
            )
            .do$()
            .subscribe(n => {
                expect(n).to.be.false;
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe('match', () => {
    it("should return false on no match when 'else' router doesn't exist", (done) =>
        p
            .match(
                () => undefined,
                p.do(throwErr)
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on no match when 'else' router doesn't exist", (done) =>
        p
            .match(
                () => undefined,
                p.do(throwErr)
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on no match when 'else' router doesn't route", (done) =>
        p
            .match(
                () => undefined,
                p.do(throwErr),
                p.no()
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return false on match when 'if' router doesn't route and 'else' router exists", (done) =>
        p
            .match(
                () => true,
                p.no(),
                p.do(throwErr)
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should route message to 'if' handler on match when 'else' router doesn't exist", (done) => {
        let routed;

        p
            .match(
                () => true,
                p.do(m => {
                    routed = true;
                })
            )
            .do$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'if' handler on match when 'else' router exists", (done) => {
        let routed;

        p
            .match(
                () => true,
                p.do(m => {
                    routed = true;
                }),
                p.do(throwErr)
            )
            .do$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' handler on no match", (done) => {
        let routed;

        p
            .match(
                () => undefined,
                p.do(throwErr),
                p.do(m => {
                    routed = true;
                })
            )
            .do$()
            .subscribe(n => {
                expect(routed).to.be.true;
            }, passErr, done);
    });

    it("should route message to 'else' router on no match", (done) => {
        let routed;

        p
            .match(
                p.no('reason'),
                p.do(throwErr),
                p.do(route => {
                    routed = route.reason;
                })
            )
            .do$()
            .subscribe(n => {
                expect(routed).to.eql('reason');
            }, passErr, done);
    });

    it("should pass value to 'then' router on match", (done) => {
        let routed;

        p
            .match(
                () => 'value',
                p.do(match => {
                    routed = match.value;
                }),
                p.do(throwErr)
            )
            .do$()
            .subscribe(n => {
                expect(routed).to.eql('value');
            }, passErr, done);
    });

    it("should pass supplied value to handler", (done) => {
        let handled;
        p
            .match(
                () => 'dog',
                p.do(match => {
                    handled = match.value;
                })
            )
            .do$()
            .subscribe(_ => {
                expect(handled).to.eql('dog');
            }, passErr, done);
    });

    it("should pass supplied argument all the way through", (done) => {
        let routed;
        p.Router.from(
            p.match(
                greeting => greeting,
                p.do(match => { routed = match.value })
            )
        )
            .do$("hey")
            .subscribe(_ => {
                expect(routed).to.eql("hey");
            }, passErr, done);
    });
});

describe('p.if', () => {
    it("should return No on false when 'else' router doesn't exist", (done) =>
        p
            .if(
                () => false,
                p.do(throwErr)
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return No on false when 'else' router doesn't route", (done) =>
        p
            .if(
                () => false,
                p.do(throwErr),
                p.no()
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return No on true when 'if' router doesn't route and 'else' router doesn't exist", (done) =>
        p
            .if(
                () => true,
                p.no()
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return No on true when 'if' router doesn't route and 'else' router exists", (done) =>
        p
            .if(
                () => true,
                p.no(),
                p.do(throwErr)
            )
            .do$()
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
            .do$()
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
            .do$()
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
            .do$()
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
            .route$()
            .subscribe(throwErr, error => done(), throwErr);
    });

    it("should throw on object", (done) => {
        p
            .if(
                () => ({ foo: "foo" }),
                p.do(throwErr)
            )
            .route$()
            .subscribe(throwErr, error => done(), throwErr);
    });

    it("should return a default reason on false", (done) => {
        p
            .if(
                () => false,
                p.do(throwErr)
            )
            .route$()
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
            .tap(route => {
                expect(route instanceof p.Do).to.be.true;
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.eql("whatevs");
            }, passErr, done);
    });

    it("should return supplied reason when 'else' router not supplied", (done) => {
        p
            .if(
                p.no('whatevs'),
                p.do(throwErr)
            )
            .route$()
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
                expect(route.reason).to.eql("whatevs");
            }, passErr, done);
    });

    it("should use formal true value", (done) => {
        let handled;

        p
            .if(
                () => new p.Match(true, .5),
                p.do(m => { handled = true; })
            )
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });

    it("should use formal false value", (done) => {
        let handled;

        p
            .if(
                () => new p.Match(false),
                p.do(throwErr)
            )
            .route$()
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
            }, passErr, done);
    });

    it('should allow undefined result for getThenRouter', (done) =>{
        p
            .if(
                () => true,
                () => undefined
            )
            .route$()
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
            }, passErr, done);
    });

    it('should allow undefined result for getElseRouter', (done) =>{
        p
            .if(
                () => false,
                throwErr,
                () => undefined
            )
            .route$()
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
            }, passErr, done);
    });

    it('should pass value all the way through', (done) => {
        let handled;

        p
            .if(
                value => value == "yes",
                p.do(() => { handled = true; }),
            )
            .do$("yes")
            .subscribe(() => {
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe('router.map', () => {
    it('should pass No through route => route', done => {
        p.no()
            .map(route => route)
            .route$()
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
            }, passErr, done)
    })

    it('should pass Do through route => route', done => {
        p.do(noop)
            .map(route => route)
            .route$()
            .subscribe(route => {
                expect(route instanceof p.Do).to.be.true;
            }, passErr, done)
    })

    it('should translate No to Do', done => {
        p.no()
            .map(route => new p.Do(noop))
            .route$()
            .subscribe(route => {
                expect(route instanceof p.Do).to.be.true;
            }, passErr, done)
    })
});

describe('router.mapByType', () => {
    it('Do should return do router', done => {
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
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('Do should return route router when do, scored routers missing', done => {
        let handled;

        p.Router
            .from(p.do(noop))
            .mapByType({
                route: p.do(() => { handled = true; }),
                default: p.do(throwErr),
                no: p.do(throwErr),
                match: p.do(throwErr)
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('Do should return default router when do, scored, route routers missing', done => {
        let handled;

        p.Router
            .from(p.do(noop))
            .mapByType({
                default: p.do(() => { handled = true; }),
                no: p.do(throwErr),
                match: p.do(throwErr)
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('Do should return identity router when do, scored, route, default routers missing', done => {
        let handled;
        let r = new p.Do(() => { handled = true; })

        p.Router
            .from(() => r)
            .mapByType({
                no: p.do(throwErr),
                match: p.do(throwErr)
            })
            .route$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done);
    })

    it('No should return no router', done => {
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
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('No should return route router when no router mnissing', done => {
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
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('No should return default router when no, route routers missing', done => {
        let handled;

        p.Router
            .from(p.no())
            .mapByType({
                do: p.do(throwErr),
                scored: p.do(throwErr),
                default: p.do(() => { handled = true; }),
                match: p.do(throwErr)
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('No should return identity router when no, route, default routers missing', done => {
        let handled;
        let r = new p.No()

        p.Router
            .from(() => r)
            .mapByType({
                do: p.do(throwErr),
                scored: p.do(throwErr),
                match: p.do(throwErr)
            })
            .route$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done);
    })

    it('Match should return match router', done => {
        let handled;

        p.Router
            .from(() => "hi")
            .mapByType({
                do: p.do(throwErr),
                scored: p.do(throwErr),
                route: p.do(throwErr),
                default: p.do(throwErr),
                no: p.do(throwErr),
                match: p.do(() => { handled = true; }),
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('Match should return scored router when match router missing', done => {
        let handled;

        p.Router
            .from(() => "hi")
            .mapByType({
                do: p.do(throwErr),
                scored: p.do(() => { handled = true; }),
                route: p.do(throwErr),
                default: p.do(throwErr),
                no: p.do(throwErr),
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('Match should return route router when match, scored routers missing', done => {
        let handled;

        p.Router
            .from(() => "hi")
            .mapByType({
                do: p.do(throwErr),
                route: p.do(() => { handled = true; }),
                default: p.do(throwErr),
                no: p.do(throwErr),
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('Match should return default router when match, scored, route routers missing', done => {
        let handled;

        p.Router
            .from(() => "hi")
            .mapByType({
                do: p.do(throwErr),
                default: p.do(() => { handled = true; }),
                no: p.do(throwErr),
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    })

    it('Match should return identity router when match, route, default routers missing', done => {
        let handled;
        let r = new p.Match("hi")

        p.Router
            .from(() => r)
            .mapByType({
                do: p.do(throwErr),
                no: p.do(throwErr)
            })
            .route$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done);
    })
})

describe('p.doable', () => {
    it('should allow Do', done => {
        let r = new p.Do(noop)
        p.Router.from(() => r)
            .tap(p.doable)
            .route$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done)
    })

    it('should allow No', done => {
        let r = new p.No()
        p.Router.from(() => r)
            .tap(p.doable)
            .route$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done)
    })

    it('should throw on Match', done => {
        let r = new p.Match("hello")
        p.Router.from(() => r)
            .tap(p.doable)
            .route$()
            .subscribe(throwErr, passErr => done(), throwErr)
    })

    it('should throw on NamedAction', done => {
        let r = new p.NamedAction("hello")
        p.Router.from(() => r)
            .tap(p.doable)
            .route$()
            .subscribe(throwErr, passErr => done(), throwErr)
    })
})

describe("router.before", () => {
    it("should pass through No", (done) => {
        p
            .no()
            .beforeDo(throwErr)
            .do$()
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
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;                
                expect(routed).to.be.true;
            }, passErr, done);
    });
});

describe("p.after", () => {
    it("should return false with No", (done) => {
        p
            .no()
            .afterDo(throwErr)
            .do$()
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
            .do$()
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
            .do$()
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
            .do$()
            .subscribe(n => {
                expect(handled).to.eql('reason');
            }, passErr, done);
    });

    it('should return No when both router and default router return No', (done) =>{
        p
            .no('reason')
            .default(p.no('another reason'))
            .route$()
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
                expect(route.reason).to.eql('another reason');
            }, passErr, done);
    });

    it('should allow undefined result for default router', (done) =>{
        p
            .no('reason')
            .default(route => undefined)
            .route$()
            .subscribe(route => {
                expect(route instanceof p.No).to.be.true;
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
                    .do$()
            )
            .do$()
            .subscribe(t => expect(t).to.be.true, passErr, done)
    );

    it("should run handler", (done) => {
        let handled;

        p
            .do(() => p
                .do(() => {
                    handled = true;
                })
                .do$()
            )
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });
});
