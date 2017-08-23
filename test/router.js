"use strict";

const chai = require('chai');
const expect = chai.expect;
const { toObservable, toFilteredObservable, isRouter, simpleRouter, toRouter, routeMessage, first, best, run, tryMatch, routeWithCombinedScore, ifMatch, ifMatchElse, nullRouter, throwRoute, catchRoute } = require('../dist/prague.js');
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

describe('nullRouter', () => {
    it('should not route', (done) => {
        nullRouter()
            .getRoute(foo)
            .subscribe(throwErr, passErr, done);
    });
})

describe('(test code) testRouter', () => {
    it('should route', (done) => {
        let routed;

        const testRouter = {
            getRoute: (m) => Observable.of({
                action: () => { routed = true; }
            })
        }

        testRouter
            .getRoute(foo)
            .flatMap(route => toObservable(route.action()))
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });
});

describe('routeMessage', () => {
    it("should complete and never commit on nullRouter", (done) => {
        routeMessage(
            nullRouter(),
            foo
        )
            .subscribe(throwErr, passErr, done);
    });

    it("should route to testRouter", (done) => {
        let routed;

        const testRouter = {
            getRoute: (m) => Observable.of({
                action: () => { routed = true; }
            })
        }

        routeMessage(
            testRouter,
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });
});

describe('isRouter', () => {
    it('should return true for a router', () => {
        expect(isRouter(nullRouter())).to.be.true;
    });

     it('should return false for a handler', () => {
        expect(isRouter(m => true)).to.be.false;
    });

})

describe('simpleRouter', () => {
    it("should convert a handler to a router", (done) => {
        let routed;

        routeMessage(
            simpleRouter(m => {
                routed = true;
            }),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });
});

describe('toRouter', () => {
    it('should convert a router to a router', (done) => {
        let routed;

        routeMessage(
            toRouter(simpleRouter(m => {
                routed = true;
            })),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should convert a handler to a router', (done) => {
        let routed;

        routeMessage(
            toRouter(m => {
                routed = true;
            }),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });
})

describe('first', () => {
    it('should complete and never emit on no routers', (done) =>
        routeMessage(
            first(),
            foo
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on only null/undefined routers', (done) =>
        routeMessage(
            first(
                null,
                undefined
            ),
            foo
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
            foo
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on no successful routers', (done) => {
        routeMessage(
            first(
                nullRouter()
            ),
            foo
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
            foo
        )
            .subscribe(n => {
                expect(foo).to.be.true;
                done();
            });
    });

    it('should route to a single successful router', (done) => {
        let routed;

        routeMessage(
            first(
                simpleRouter(m => {
                    routed = true;
                })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should ignore null/undefined routers and route to a successful router', (done) => {
        let routed;

        routeMessage(
            first(
                null,
                undefined,
                simpleRouter(m => {
                    routed = true;
                })
            ),
            false
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should skip an unsuccessful router and route to a successful router', (done) => {
        let routed;

        routeMessage(
            first(
                nullRouter(),
                simpleRouter(m => {
                    routed = true;
                })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

});

const makeRouter = (score, action) => ({
    getRoute: (m) => Observable.of({
        score,
        action
    })
});

describe('best', () => {
    it('should complete and never emit on no routers', (done) =>
        routeMessage(
            best(),
            foo
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on only null/undefined routers', (done) =>
        routeMessage(
            best(
                null,
                undefined
            ),
            foo
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on only unsuccessful and null/undefined routers', (done) =>
        routeMessage(
            best(
                nullRouter(),
                null,
                undefined
            ),
            foo
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on no successful routers', (done) => {
        routeMessage(
            best(
                nullRouter()
            ),
            foo
        )
            .subscribe(throwErr, passErr, done)
    });

    it('should convert a scoreless handler to a router, and route to it', (done) => {
        let foo = false;
        routeMessage(
            best(
                m => {
                    foo = true;
                }
            ),
            foo
        )
            .subscribe(n => {
                expect(foo).to.be.true;
                done();
            });
    });

    it('should route to a single successful scoreless router', (done) => {
        let routed;

        routeMessage(
            best(
                simpleRouter(m => {
                    routed = true;
                })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should ignore null/undefined routers and route to a successful scoreless router', (done) => {
        let routed;

        routeMessage(
            best(
                null,
                undefined,
                simpleRouter(m => {
                    routed = true;
                })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should skip an unsuccessful router and route to a successful scoreless router', (done) => {
        let routed;

        routeMessage(
            best(
                nullRouter(),
                simpleRouter(m => {
                    routed = true;
                })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it('should return the higher scoring route when it is first', (done) => {
        let routed;

        routeMessage(
            best(
                makeRouter(0.75, _ => { routed = 'first'; }),
                makeRouter(0.50, _ => { routed = 'second'; })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.eql('first');
                done();
            });
    });

    it('should return the higher scoring route when it is second', (done) => {
        let routed;

        routeMessage(
            best(
                makeRouter(0.50, _ => { routed = 'first'; }),
                makeRouter(0.75, _ => { routed = 'second'; })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.eql('second');
                done();
            });
    });

    it('should return the treat missing scores as 1', (done) => {
        let routed;

        routeMessage(
            best(
                makeRouter(undefined, _ => { routed = 'first'; }),
                makeRouter(0.75, _ => { routed = 'second'; })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.eql('first');
                done();
            });
    });

    it('should return the first of two tied scores', (done) => {
        let routed;

        routeMessage(
            best(
                makeRouter(0.75, _ => { routed = 'first'; }),
                makeRouter(0.75, _ => { routed = 'second'; })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.eql('first');
                done();
            });
    });
});


describe('run', () => {
    it("should execute the handler, complete, and never emit", (done) => {
        let routed;

        routeMessage(
            run(
                m => {
                    routed = true;
                }
            ),
            foo
        )
            .subscribe(throwErr, passErr, _ => {
                expect(routed).to.be.true;
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

describe('routeWithCombinedScore', () => {
    it("should return score=1 with both scores undefined", () => {
        expect(routeWithCombinedScore(
            {
                action: () => {}
            }
        ).score).to.eql(1);
    });

    it("should return supplied score when route score undefined", () => {
        expect(routeWithCombinedScore(
            {
                action: () => {}
            },
            .13
        ).score).to.eql(.13);
    });

    it("should return route score when supplied score undefined", () => {
        expect(routeWithCombinedScore(
            {
                score: .13,
                action: () => {}
            }
        ).score).to.eql(.13);
    });

    it("should return combined score when both scores supplied", () => {
        expect(routeWithCombinedScore(
            {
                score: .4,
                action: () => {}
            },
            .25
        ).score).to.eql(.1);
    });
})

describe('ifMatch', () => {
    it('should complete and never emit on false predicate', (done) =>
        routeMessage(
            ifMatch(
                m => false,
                throwErr
            ),
            foo
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should complete and never emit on no match', (done) =>
        routeMessage(
            ifMatch(
                addBar,
                throwErr
            ),
            notFoo
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should route message to handler on true predicate', (done) => {
        let routed;

        routeMessage(
            ifMatch(
                m => true,
                m => {
                    routed = true;
                }
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it('should route message to router on true predicate', (done) => {
        let routed;

        routeMessage(
            ifMatch(
                m => true,
                simpleRouter(m => {
                    routed = true;
                })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it('should route message to handler on match', (done) => {
        let routed;

        routeMessage(
            ifMatch(
                addBar,
                m => {
                    routed = true;
                }
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it('should route message to router on match', (done) => {
        let routed;

        routeMessage(
            ifMatch(
                addBar,
                simpleRouter(m => {
                    routed = true;
                })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should return score=1 with both scores undefined", (done) => {
        ifMatch(
            m => true,
            m => {}
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(route.score).to.eql(1);
                done();
            })
    });

    it("should return supplied score when route score undefined", (done) => {
        ifMatch(
            m => ({
                score: 0.4  
            }),
            () => {}
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.4);
                done();
            })
    });

    it("should return route score when supplied score undefined", (done) => {
        ifMatch(
            m => true,
            makeRouter(0.25, () => {})
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.25);
                done();
            })
    });

    it("should return combined score when both scores supplied", (done) => {
        ifMatch(
            m => ({
                score: 0.4  
            }),
            makeRouter(0.25, () => {})
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.1);
                done();
            })
    });
  
});

describe('ifMatchElse', () => {
    it("should complete and never emit on true predicate when first router doesn't route", (done) =>
        routeMessage(
            ifMatchElse(
                m => true,
                nullRouter(),
                throwErr
            ),
            foo
        )
            .subscribe(throwErr, passErr, done)
    );

    it("should complete and never emit on match when first router doesn't route", (done) =>
        routeMessage(
            ifMatchElse(
                addBar,
                nullRouter(),
                throwErr
            ),
            foo
        )
            .subscribe(throwErr, passErr, done)
    );

    it("should complete and never emit on false predicate when second router doesn't route", (done) =>
        routeMessage(
            ifMatchElse(
                m => false,
                throwErr,
                nullRouter()
            ),
            foo
        )
            .subscribe(throwErr, passErr, done)
    );

    it("should complete and never emit on no match when second router doesn't route", (done) =>
        routeMessage(
            ifMatchElse(
                addBar,
                throwErr,
                nullRouter()
            ),
            notFoo
        )
            .subscribe(throwErr, passErr, done)
    );

    it('should route message to first handler on true predicate', (done) => {
        let routed;

        routeMessage(
            ifMatchElse(
                m => true,
                m => {
                    routed = true;
                },
                throwErr
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it('should route message to first router on true predicate', (done) => {
        let routed;

        routeMessage(
            ifMatchElse(
                m => true,
                simpleRouter(m => {
                    routed = true;
                }),
                throwErr
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it('should route message to first handler on match', (done) => {
        let routed;

        routeMessage(
            ifMatchElse(
                addBar,
                m => {
                    routed = true;
                },
                throwErr
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it('should route message to first router on no match', (done) => {
        let routed;

        routeMessage(
            ifMatchElse(
               addBar,
                simpleRouter(m => {
                    routed = true;
                }),
                throwErr
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it('should route message to second handler on false predicate', (done) => {
        let routed;

        routeMessage(
            ifMatchElse(
                m => false,
                throwErr,
                m => {
                    routed = true;
                }
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it('should route message to second router on false predicate', (done) => {
        let routed;

        routeMessage(
            ifMatchElse(
                m => false,
                throwErr,
                simpleRouter(m => {
                    routed = true;
                })
            ),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it('should route message to second handler on no match', (done) => {
        let routed;

        routeMessage(
            ifMatchElse(
                addBar,
                throwErr,
                m => {
                    routed = true;
                }
            ),
            notFoo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it('should route message to second router on no match', (done) => {
        let routed;

        routeMessage(
            ifMatchElse(
                addBar,
                throwErr,
                simpleRouter(m => {
                    routed = true;
                })
            ),
            notFoo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            })
    });

    it("should return score=1 on true predicate when route score undefined", (done) => {
        ifMatchElse(
            m => true,
            m => {},
            m => {}
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(route.score).to.eql(1);
                done();
            })
    });

    it("should return score=1 on scoreless match when route score undefined", (done) => {
        ifMatchElse(
            m => ({}),
            m => {},
            m => {}
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(route.score).to.eql(1);
                done();
            })
    });

    it("should return supplied score on match when 'if' route score undefined", (done) => {
        ifMatchElse(
            m => ({
                score: 0.4  
            }),
            m => {},
            m => {}
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.4);
                done();
            })
    });

    it("should return 'if' route score when match score undefined", (done) => {
        ifMatchElse(
            m => true,
            makeRouter(0.25, () => {}),
            makeRouter(0.5, () => {})
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.25);
                done();
            })
    });

    it("should combine supplied score and 'if' route score on match", (done) => {
        ifMatchElse(
            m => ({
                score: 0.4  
            }),
            makeRouter(0.25, () => {}),
            makeRouter(0.5, () => {})
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.1);
                done();
            })
    });

    it("should return 'else' route score on false predicate", (done) => {
        ifMatchElse(
            m => false,
            makeRouter(0.25, () => {}),
            makeRouter(0.5, () => {})
        )
            .getRoute(foo)
            .subscribe(route => {
                expect(route.score).to.eql(.5);
                done();
            })
    });

    it("should return 'else' route score on no match", (done) => {
        ifMatchElse(
            addBar,
            makeRouter(0.25, () => {}),
            makeRouter(0.5, () => {})
        )
            .getRoute(notFoo)
            .subscribe(route => {
                expect(route.score).to.eql(.5);
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

        routeMessage(
            catchRoute(m => {
                routed = true;
            }),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it("should pass through the route from a non-throwing router", (done) => {
        let routed;

        routeMessage(
            catchRoute(simpleRouter(m => {
                routed = true;
            })),
            foo
        )
            .subscribe(n => {
                expect(routed).to.be.true;
                done();
            });
    });

    it("should complete and never emit with a thrown route", (done) => {
        let routed;

        routeMessage(
            catchRoute(throwRoute()),
            foo
        )
            .subscribe(throwErr, passErr, done);
    });
});
