"use strict";

const chai = require('chai');
const expect = chai.expect;
const { tryMatch, matchAll } = require('../dist/prague.js');

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
            expect(n).to.equal(foo);
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
            expect(n).to.equal(foo);
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


