"use strict";

const chai = require('chai');
const expect = chai.expect;
const { tryMatch } = require('../dist/prague.js');

const foo = {
    foo: "foo"
}

const bar = {
    bar: "bar"
}

const addBar = (m) => Object.assign({}, m, bar);

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
    it('should complete and never emit on false', (done) =>
        tryMatch(m => false, foo).subscribe(throwErr, passErr, done)
    );

    it('should pass message through on true', (done) => {
        tryMatch(m => true, foo).subscribe(n => {
            expect(n).to.equal(foo);
            done();
        });
    });

    it('should complete on true', (done) => {
        tryMatch(m => true, foo).subscribe(noop, noop, done);
    });
    
    it('should pass result through on match', (done) => {
        tryMatch(addBar, foo).subscribe(n => {
            expect(n).to.eql(fooPlusBar);
            done();
        });
    });


});



