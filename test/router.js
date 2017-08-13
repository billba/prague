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

describe('tryMatch', () => {
    tryMatch(m => false, foo).subscribe(
        n => 
            it('should never emit on false', () => {
                throw new Error();
            }),
        error => {},
        () =>
            it('should complete on false', () =>
                true
            )
    );

    tryMatch(m => true, foo).subscribe(n => 
        it('should pass message through on true', () => {
            expect(n).to.equal(foo)
        })
    );

});



