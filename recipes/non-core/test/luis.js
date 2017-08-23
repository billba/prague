"use strict";

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-subset'));

const { tryMatch, routeMessage, LuisModel, LuisResponse } = require('../dist/prague.js');
const { Observable } = require('rxjs');

const foo = {
    text: "foo"
}

const throwErr = () => {
    throw new Error();
}

const passErr = (err) => {
    throw err;
}

const noop = () => {}

const entities = [{
    entity: 'Wagon Wheel',
    type: "song",
    startIndex: 0,
    endIndex: 11,
    score: .95
}, {
    entity: 'Pub',
    type: "what",
    startIndex: 0,
    endIndex: 3,
    score: .89
}, {
    entity: 'London',
    type: "where",
    startIndex: 0,
    endIndex: 6,
    score: .72
}];

const intents = [
    { intent: 'foo', score: .75 },
    { intent: 'foobar', score: .51 },
    { intent: 'bar', score: .45 },
]

const filteredIntents = intents.filter(i => i.score > .5);

let counter = 0;

const mockLuis = (intents, entities) => {
    return new LuisModel(query => {
        counter++;
        return Promise.resolve({
            query,
            intents: intents.filter(i => i.score >= .50),
            entities
        });
    });
}

describe('luis.query', () => {
    it('should return on no entities and no intents', (done) => {
        mockLuis([], [])
            .query("foo")
            .subscribe(n => {
                expect(n).to.containSubset({
                    intents: [],
                    entities: [],
                });
                done();
            });
    });

    it('should filter out low-scoring intents', (done) => {
        mockLuis(intents, [])
            .query("foo")
            .subscribe(n => {
                expect(n).to.containSubset({
                    intents: filteredIntents,
                    entities: [],
                });
                done();
            });
    });

    it('should fetch a requery from the cache', (done) => {
        counter = 0;
        const ml = mockLuis([], []);
        ml.query("foo")
            .subscribe(noop, noop, _ => ml.query("foo")
                .subscribe(noop, noop, _ => {
                    expect(counter).to.equal(1);
                    done();
                })
            );
    });

    it('should not fetch a query from the cache', (done) => {
        counter = 0;
        const ml = mockLuis([], []);
        ml.query("foo")
            .subscribe(noop, noop, _ => ml.query("bar")
                .subscribe(noop, noop, _ => {
                    expect(counter).to.equal(2);
                    done();
                })
            );
    });

    it('should return entity function', (done) => {
        counter = 0;
        mockLuis(intents, entities)
            .query("foo")
            .subscribe(n => {
                expect(n.entity("what")[0]).to.containSubset({
                    entity: 'Pub'
                });
                done();
            });
    });

    it('should return entityValues function', (done) => {
        counter = 0;
        mockLuis([], entities)
            .query("foo")
            .subscribe(n => {
                expect(n.entityValues("what")[0]).to.eql('Pub');
                done();
            })
    });

});

const message = {
    text: "foo"
}

describe('luis.match', () => {
    it("should complete without emitting when no intents", (done) => {
        tryMatch(mockLuis([], []).matchIntent('foobar'), message)
            .subscribe(throwErr, passErr, done);
    });

    it("should complete without emitting when specified intent doesn't exist", (done) => {
        tryMatch(mockLuis(intents, []).matchIntent('barfoo'), message)
            .subscribe(throwErr, passErr, done);
    });

    it('should add luis match with score of specified intent', (done) => {
        tryMatch(mockLuis(intents, entities).matchIntent('foobar'), message)
            .subscribe(n => {
                expect(n).to.containSubset({
                    intents: filteredIntents,
                    entities,
                    score: .51
                });
                done();
            });
    });

});

describe('luis.best', () => {
    it("shouldn't route if no intents listed", (done) => {
        routeMessage(
            mockLuis(intents, []).best({
            }),
            message
        )
            .subscribe(throwErr, passErr, done);
    });

    it("shouldn't route if no intents returned", (done) => {
        routeMessage(
            mockLuis([], []).best({
                foo: throwErr
            }),
            message
        )
            .subscribe(throwErr, passErr, done);
    });

    it("shouldn't route if no returned intent is listed", (done) => {
        routeMessage(
            mockLuis(intents, []).best({
                barFoo: throwErr
            }),
            message
        )
            .subscribe(throwErr, passErr, done);
    });

    it('should route to the correct router', (done) => {
        routeMessage(
            mockLuis(intents, []).best({
                foo: m => {
                    expect(m.score).to.equal(.75);
                    done();
                }
            }),
            message
        )
            .subscribe();
    });
});