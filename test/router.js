"use strict";

const chai = require('chai');
const expect = chai.expect;
const { tryMatch } = require('../dist/prague.js');

const foo = {
    foo: "foo"
}

const addBar = (m) => Object.assign({}, foo, {
    bar: "bar"
});

const fooPlusBar = {
    foo: "foo",
    bar: "bar"
}

tryMatch(m => false, foo).subscribe(
    n => 
        describe('tryMatch', () => {
            it('should never emit on false', () =>
                false
            );
        }),
    error => {},
    () =>
        describe('tryMatch', () => {
            it('should complete on false', () =>
                true
            );
        })
);

tryMatch(m => true, foo).subscribe(n => 
    describe('tryMatch', () => {
        it('should pass message through on true', () => {
            expect(n).to.equal(foo)
        });
    })
);



