"use strict";

const chai = require('chai');
const expect = chai.expect;
const { tryMatch, matchAll, matchAny } = require('../dist/prague.js');

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
