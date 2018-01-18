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
    it('should create a DoRoute with supplied action ', (done) => {
        let handled;
        let action = () => { handled = true; };
        let route = new p.DoRoute(action);
        expect(route instanceof p.DoRoute).to.be.true;
        route
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done);
    });
});

describe('p.NoRoute', () => {
    it('should create a NoRoute with default reason', () => {
        let route = new p.NoRoute();

        expect(route instanceof p.NoRoute).to.be.true;
        expect(route.reason).to.eql('none');
    });

    it('should create a NoRoute with supplied reason', () => {
        let route = new p.NoRoute('reason');

        expect(route instanceof p.NoRoute).to.be.true;
        expect(route.reason).to.eql('reason');
    });
});

describe('p.do', () => {
    it('should return a function returning doRoute using supplied action', (done) => {
        let handled;
        let route = p
            .do(m => { handled = m; })
            .tap(route => {
                expect(route instanceof p.DoRoute).to.be.true;
            })
            .do$(foo)
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.eql(foo);
            }, passErr, done);
    });
});

describe('p.no', () => {
    it('should return a NoRoute with the default reason', (done) => {
        let route = p
            .no()
            .route$(foo)
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql('none');
            }, passErr, done);
    });

    it('should return a NoRoute with the supplied reason', (done) => {
        let route = p
            .no('reason')
            .route$(foo)
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql('reason');
            }, passErr, done);
    });
});

describe('new p.MatchRoute', () => {
    it('should return a MatchRoute with the supplied value', () => {
        let route = new p.MatchRoute("hello");
        expect(route instanceof p.MatchRoute).to.be.true;
        expect(route.value).to.eql('hello');
    });
});

describe('p.TemplateRoute', () => {
    it('should create a TemplateRoute', () => {
        let route = new p.TemplateRoute('foo', { value: "hello"});

        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql("foo");
        expect(route.args.value).to.eql("hello");
        expect(route.score).to.eql(1);
        expect(route.source).to.be.undefined;
    });

    it('should create a TemplateRoute with score', () => {
        let route = new p.TemplateRoute('foo', { value: "hello"}, .5);

        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql("foo");
        expect(route.args.value).to.eql("hello");
        expect(route.score).to.eql(.5);
        expect(route.source).to.be.undefined;
    });

    it('should create a TemplateRoute with source', () => {
        let route = new p.TemplateRoute('foo', { value: "hello"}, "source");

        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql("foo");
        expect(route.args.value).to.eql("hello");
        expect(route.source).to.eql("source");
        expect(route.score).to.eql(1);
        
    });

    it('should create a TemplateRoute with source and score', () => {
        let route = new p.TemplateRoute('foo', { value: "hello"}, "source", .5);

        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql("foo");
        expect(route.args.value).to.eql("hello");
        expect(route.source).to.eql("source");
        expect(route.score).to.eql(.5);
    });
})

describe('p.Templates.route', () => {
    let templates = new p.Templates({
        foo: () => {}
    });

    it('should return a TemplateRoute with the supplied value', () => {
        let route = templates.route('foo', { value: "hello" });

        expect(route.action).to.eql("foo"); 
        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql("foo");
        expect(route.args.value).to.eql("hello");
        expect(route.score).to.eql(1);
        expect(route.source).to.be.undefined;
    });

    it('should return a TemplateRoute with the supplied value and score', () => {
        let route = templates.route('foo', { value: "hello" }, .5);

        expect(route.action).to.eql("foo"); 
        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql("foo");
        expect(route.args.value).to.eql("hello");
        expect(route.score).to.eql(.5);
        expect(route.source).to.be.undefined;
    });

    it('should return a TemplateRoute with the supplied value and source', () => {
        let route = templates.route('foo', { value: "hello" }, "hello");

        expect(route.action).to.eql("foo"); 
        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql("foo");
        expect(route.args.value).to.eql("hello");
        expect(route.score).to.eql(1);
        expect(route.source).to.eql("hello");
    });

    it('should return a TemplateRoute with the supplied value, source, and score', () => {
        let route = templates.route('foo', { value: "hello" }, "hello", .5);

        expect(route.action).to.eql("foo"); 
        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql("foo");
        expect(route.args.value).to.eql("hello");
        expect(route.score).to.eql(.5);
        expect(route.source).to.eql("hello");
    });
});

describe('p.Templates.router', () => {
    let templates = new p.Templates({
        foo: () => {}
    });

    it('should return a TemplateRoute with the supplied value', (done) => {
        templates
            .router('foo', { value: "hello" })
            .route$()
            .subscribe(route => {
                expect(route.action).to.eql("foo"); 
                expect(route instanceof p.TemplateRoute).to.be.true;
                expect(route.action).to.eql("foo");
                expect(route.args.value).to.eql("hello");
                expect(route.score).to.eql(1);
                expect(route.source).to.be.undefined;
            }, passErr, done);
    });

    it('should return a TemplateRoute with the supplied value and score', (done) => {
        templates
            .router('foo', { value: "hello" }, .5)
            .route$()
            .subscribe(route => {
                expect(route.action).to.eql("foo"); 
                expect(route instanceof p.TemplateRoute).to.be.true;
                expect(route.action).to.eql("foo");
                expect(route.args.value).to.eql("hello");
                expect(route.score).to.eql(.5);
                expect(route.source).to.be.undefined;
            }, passErr, done);
    });

    it('should return a TemplateRoute with the supplied value and source', (done) => {
        templates
            .router('foo', { value: "hello" }, "hello")
            .route$()
            .subscribe(route => {
                expect(route.action).to.eql("foo"); 
                expect(route instanceof p.TemplateRoute).to.be.true;
                expect(route.action).to.eql("foo");
                expect(route.args.value).to.eql("hello");
                expect(route.score).to.eql(1);
                expect(route.source).to.eql("hello");
            }, passErr, done);
    });
    
    it('should return a TemplateRoute with the supplied value, source, and score', (done) => {
        templates
            .router('foo', { value: "hello" }, "hello", .5)
            .route$()
            .subscribe(route => {
                expect(route.action).to.eql("foo"); 
                expect(route instanceof p.TemplateRoute).to.be.true;
                expect(route.action).to.eql("foo");
                expect(route.args.value).to.eql("hello");
                expect(route.score).to.eql(.5);
                expect(route.source).to.eql("hello");
            }, passErr, done);
    });
});

describe('router.MapTemplate', () => {
    it('should map a template with no context', (done) => {
        let handled;

        let templates = new p.Templates(() => ({
            foo: args => { handled = args.value; }
        }));

        let route = templates.route('foo', { value: "hello" });

        expect(route.action).to.eql("foo"); 
        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql("foo");
        expect(route.args.value).to.eql("hello");
        expect(route.score).to.eql(1);
        expect(route.source).to.be.undefined;
        
        p.Router
            .from(() => route)
            .mapTemplate(templates)
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.eql('hello');
            }, passErr, done);
    });

    it('should map a template with context', (done) => {
        let handled;

        let templates = new p.Templates(c => ({
            foo: args => { handled = args.value + c; }
        }));

        let route = templates.route('foo', { value: "hello" });

        expect(route.action).to.eql("foo"); 
        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql("foo");
        expect(route.args.value).to.eql("hello");
        expect(route.score).to.eql(1);
        expect(route.source).to.be.undefined;
        
        p.Router
            .from(() => route)
            .mapTemplate(templates, " world")
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.eql('hello world');
            }, passErr, done);
    });

    it('should throw on an unknown action', (done) => {
        let handled;

        let templates = new p.Templates(() => {
            foo: args => { handled = args.value; }
        });

        let route = new p.TemplateRoute('bar', { value: "hello" });

        p.Router
            .from(() => route)
            .mapTemplate(templates)
            .do$()
            .subscribe(throwErr, passErr => done(), throwErr);
    });
});

describe('p.MultipleRoute', () => {
    it('should create a MultipleRoute', () => {
        let routeA = new p.TemplateRoute('foo', { value: "hello"}, .5);
        let routeB = new p.TemplateRoute('bar', { value: "goodbye"}, .7);

        let route = new p.MultipleRoute([
            routeA,
            routeB
        ]);

        expect(route instanceof p.MultipleRoute).to.be.true;
        expect(route.routes[0]).to.eql(routeA);
        expect(route.routes[1]).to.eql(routeB);
        expect(JSON.stringify(route)).to.eql(`{"routes":[{"score":0.5,"action":"foo","args":{"value":"hello"}},{"score":0.7,"action":"bar","args":{"value":"goodbye"}}]}`);
    });
})

describe('new Router', () => {
    it('should create a Router returning NoRoute when no router supplied', done => {
        new p.Router()
            .route$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done);
    });

    it('should copy the route$ from a Router', () => {
        let handled;
        let router = p.do(() => { handled = true; });
        let r = new p.Router(router);
        expect(r.route$).to.eql(router.route$);
    });

    it('should create a Router from a DoRoute', (done) => {
        let handled;
        let router = () => new p.DoRoute(() => { handled = true; });
        let r = new p.Router(router);
        
        expect(r).not.to.eql(router);
        r
            .tap(route => {
                expect(route instanceof p.DoRoute).to.be.true;
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

    it('should create a Router from arg => Router', (done) => {
        let handled;
        let router = (arg) => p.do(() => { handled = arg; });
        new p
            .Router(router)
            .tap(route => {
                expect(route instanceof p.DoRoute).to.be.true;
            })
            .do$(foo)
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.eql(foo);
            }, passErr, done)
    });

    it('should create a Router returning MatchRoute from arg => value', (done) => {
        let handled;
        let router = (arg) => "hi";
        new p.Router(router)
            .route$(foo)
            .subscribe(route => {
                expect(route instanceof p.MatchRoute).to.be.true;
                expect(route.value).to.eql("hi");
            }, passErr, done)
    });

    it('should create a Router returning NoRoute from arg => undefined', (done) => {
        let handled;
        let router = (arg) => {};
        new p.Router(router)
            .route$(foo)
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
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
            .tap(route => {
                expect(route instanceof p.DoRoute).to.be.true;
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.true;
                expect(handled).to.be.true;
            }, passErr, done)
    });

});

describe('router.do$', () => {
    it("should return false on NoRoute with no arg", (done) => {
        p
            .no()
            .do$()
            .subscribe(t => {
                expect(t).to.be.false;
            }, passErr, done);
    });

    it("should return false on NoRoute with arg", (done) => {
        p
            .no()
            .do$(foo)
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
            .do$()
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
            .do$(foo)
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
            .do$(foo)
            .subscribe(t => {
                expect(t).to.be.true;
                expect(routed).to.eql(foo);
            }, passErr, done);
    });

    it("should throw on TemplateRoute", (done) => {
        p
            .Router
            .from(() => new p.TemplateRoute('foo', {}))
            .do$()
            .subscribe(throwErr, passErr => done(), throwErr);
    });

    it("should throw on MatchRoute", (done) => {
        p
            .Router
            .from(() => new p.MatchRoute('foo'))
            .do$()
            .subscribe(throwErr, passErr => done(), throwErr);
    });

});

describe('router.mapMultiple', () => {
    let routeA = new p.TemplateRoute('foo', {}, "foo", .5);
    let routeB = new p.TemplateRoute('bar', {}, "bar", .5);

    let route = new p.MultipleRoute([routeA, routeB]);

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
});

describe('p.ScoredRoute.combinedScore', () => {
    it("should return combined score", () => {
        expect(p.ScoredRoute.combinedScore(.4, .25)).to.eql(.1);
    });
})

describe('templateRoute.cloneWithScore', () => {
    let original = new p.TemplateRoute('foo', undefined, .4);

    it("should return original route when supplied score matches route score", () => {
        let route = original.cloneWithScore(.4);

        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route).to.eql(original);
    });

    it("should return route with supplied score", () => {
        let route = original.cloneWithScore(.25);

        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route.action).to.eql('foo');
        expect(route.score).to.eql(.25);
    });
});

describe('templateRoute.cloneWithCombinedScore', () => {
    let original = new p.TemplateRoute('foo', undefined, .4);

    it("should return original route when score to be combined is 1", () => {
        let route = original.cloneWithCombinedScore();

        expect(route instanceof p.TemplateRoute).to.be.true;        
        expect(route).to.eql(original);
    });

    it("should return new route when score to be combined is not 1", () => {
        let route = original.cloneWithCombinedScore(.25);

        expect(route instanceof p.TemplateRoute).to.be.true;
        expect(route).to.not.eql(original);
        expect(route.action).to.eql('foo');
        expect(route.score).to.eql(.1);
    });
})

describe('p.best', () => {
    it('should return NoRoute on no routers', (done) => {
        p
            .best()
            .route$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done)
    });

    it('should return NoRoute on only null/undefined routers', (done) =>
        p
            .best(
                null,
                undefined
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done)
    );

    it('should return NoRoute on only unsuccessful and null/undefined routers', (done) =>
        p
            .best(
                p.no(),
                null,
                undefined
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done)
    );

    it('should return NoRoute on no successful routers', (done) => {
        p
            .best(
                p.no()
            )
            .route$()        
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done)
    });

    it('should route to a single successful scoreless router', (done) => {
        let r = new p.TemplateRoute('foo');

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
        let r = new p.TemplateRoute('foo');

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
        let r = new p.TemplateRoute('foo');
        
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
                () => new p.TemplateRoute('foo', {}, .75),
                () => new p.TemplateRoute('bar', {}, .5)
            )
            .route$()            
            .subscribe(route => {
                expect(route.action).to.eql('foo');
                expect(route.score).to.eql(.75);
            }, passErr, done);
    });

    it('should return the higher scoring route when it is second', (done) => {
        p
            .best(
                () => new p.TemplateRoute('bar', {}, .5),
                () => new p.TemplateRoute('foo', {}, .75)
            )
            .route$()            
            .subscribe(route => {
                expect(route.action).to.eql('foo');
                expect(route.score).to.eql(.75);
            }, passErr, done);
    });

    it('should return two tied scores as a MultipleRoute', (done) => {
        let routeA = new p.TemplateRoute('foo', {}, "foo", .5);
        let routeB = new p.TemplateRoute('bar', {}, "bar", .5);

        p
            .best(
                () => routeA,
                () => routeB
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.MultipleRoute).to.be.true;
                expect(route.routes[0]).to.eql(routeA);
                expect(route.routes[0].source).to.eql("foo");
                expect(route.routes[1]).to.eql(routeB);
                expect(route.routes[1].source).to.eql("bar");
            }, passErr, done);
    });

    it('should return two tied high scores as a MultipleRoute', (done) => {
        let routeA = new p.TemplateRoute('foo', {}, .5);
        let routeB = new p.TemplateRoute('bar', {}, .5);
        let routeC = new p.TemplateRoute('foobar', {}, .4);

        p
            .best(
                () => routeA,
                () => routeB,
                () => routeC
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.MultipleRoute).to.be.true;
                expect(route.routes[0]).to.eql(routeA);
                expect(route.routes[1]).to.eql(routeB);
            }, passErr, done);
    });

    it('should return two tied high scores as a MultipleRoute (different order)', (done) => {
        let routeA = new p.TemplateRoute('foo', {}, .5);
        let routeB = new p.TemplateRoute('bar', {}, .5);
        let routeC = new p.TemplateRoute('foobar', {}, .4);

        p
            .best(
                () => routeA,
                () => routeC,
                () => routeB
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.MultipleRoute).to.be.true;
                expect(route.routes[0]).to.eql(routeA);
                expect(route.routes[1]).to.eql(routeB);
            }, passErr, done);
    });

    it('should return two tolerance-tied high scores as a MultipleRoute', (done) => {
        let routeA = new p.TemplateRoute('foo', {}, .5);
        let routeB = new p.TemplateRoute('bar', {}, .4);
        let routeC = new p.TemplateRoute('foobar', {}, .2);

        p
            .best(
                .1,
                () => routeA,
                () => routeB,
                () => routeC
            )
            .route$()            
            .subscribe(route => {
                expect(route instanceof p.MultipleRoute).to.be.true;
                expect(route.routes[0]).to.eql(routeA);
                expect(route.routes[1]).to.eql(routeB);
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
            greeting => p.match(
                () => greeting,
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
    it("should return NoRoute on false when 'else' router doesn't exist", (done) =>
        p
            .if(
                () => false,
                p.do(throwErr)
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return NoRoute on false when 'else' router doesn't route", (done) =>
        p
            .if(
                () => false,
                p.do(throwErr),
                p.no()
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return NoRoute on true when 'if' router doesn't route and 'else' router doesn't exist", (done) =>
        p
            .if(
                () => true,
                p.no()
            )
            .do$()
            .subscribe(t => expect(t).to.be.false, passErr, done)
    );

    it("should return NoRoute on true when 'if' router doesn't route and 'else' router exists", (done) =>
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
                expect(route instanceof p.DoRoute).to.be.true;
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
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql("whatevs");
            }, passErr, done);
    });

    it("should use formal true value", (done) => {
        let handled;

        p
            .if(
                () => new p.MatchRoute(true, .5),
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
                () => new p.MatchRoute(false),
                p.do(throwErr)
            )
            .route$()
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
            .route$()
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
            .route$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done);
    });
});

describe('router.map', () => {
    it('should pass NoRoute through route => route', done => {
        p.no()
            .map(route => route)
            .route$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
            }, passErr, done)
    })

    it('should pass DoRoute through route => route', done => {
        p.do(noop)
            .map(route => route)
            .route$()
            .subscribe(route => {
                expect(route instanceof p.DoRoute).to.be.true;
            }, passErr, done)
    })

    it('should translate NoRoute to DoRoute', done => {
        p.no()
            .map(route => new p.DoRoute(noop))
            .route$()
            .subscribe(route => {
                expect(route instanceof p.DoRoute).to.be.true;
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
            .do$()
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
            .do$()
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
            .do$()
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
            .route$()
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
            .do$()
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
            .do$()
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
            .do$()
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
            .route$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done);
    })

    it('MatchRoute should return match router', done => {
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

    it('MatchRoute should return scored router when match router missing', done => {
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

    it('MatchRoute should return route router when match, scored routers missing', done => {
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

    it('MatchRoute should return default router when match, scored, route routers missing', done => {
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

    it('MatchRoute should return identity router when match, route, default routers missing', done => {
        let handled;
        let r = new p.MatchRoute("hi")

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
    it('should allow DoRoute', done => {
        let r = new p.DoRoute(noop)
        p.Router.from(() => r)
            .tap(p.doable)
            .route$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done)
    })

    it('should allow NoRoute', done => {
        let r = new p.NoRoute()
        p.Router.from(() => r)
            .tap(p.doable)
            .route$()
            .subscribe(route => {
                expect(route).to.eql(r);
            }, passErr, done)
    })

    it('should throw on MatchRoute', done => {
        let r = new p.MatchRoute("hello")
        p.Router.from(() => r)
            .tap(p.doable)
            .route$()
            .subscribe(throwErr, passErr => done(), throwErr)
    })

    it('should throw on TemplateRoute', done => {
        let r = new p.TemplateRoute("hello")
        p.Router.from(() => r)
            .tap(p.doable)
            .route$()
            .subscribe(throwErr, passErr => done(), throwErr)
    })
})

describe("router.before", () => {
    it("should pass through NoRoute", (done) => {
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
    it("should return false with NoRoute", (done) => {
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

    it('should return NoRoute when both router and default router return NoRoute', (done) =>{
        p
            .no('reason')
            .default(p.no('another reason'))
            .route$()
            .subscribe(route => {
                expect(route instanceof p.NoRoute).to.be.true;
                expect(route.reason).to.eql('another reason');
            }, passErr, done);
    });

    it('should allow undefined result for default router', (done) =>{
        p
            .no('reason')
            .default(route => undefined)
            .route$()
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

describe('p.switch', () => {
    it("doesn't route on undefined key", done => {
        p
            .switch(() => undefined, {
                foo: p.do(throwErr)
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("doesn't route on null key", done => {
        
        p
            .switch(() => null, {
                foo: p.do(throwErr)
            })
            .do$()
            .subscribe(t => {
                expect(t).to.be.false;                
            }, passErr, done);
    });

    it("doesn't route on non-matching key", done => {
        p
            .switch(() => 'bar', {
                foo: p.do(throwErr)
            })
            .do$()
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
            .do$()
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
            .do$()
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
            .do$()
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
            .do$()
            .subscribe(t => {
                expect(t).to.be.false;       
            }, passErr, done);
    });
});

