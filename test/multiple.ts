import { expect, isNull } from './common';
import { toArray, fromArray, Scored } from '../src/prague';

export const matches = [
    Scored.from("hello", .75),
    Scored.from("hi", .5),
];

export const rev = [...matches].reverse();

export const spreadme = [
    Scored.from("aloha", .65),
    Scored.from("wassup", .3),
];

export const spreaded = [
    matches[0],
    spreadme[0],
    matches[1],
    spreadme[1],
]

describe("toArray", () => {
    const s = "Hi";

    it("should create an empty array on no args", () => 
        toArray(
        )()
        .then(_m => {
            expect(_m).deep.equals([]);
        })
    );

    it("should create an empty array on () => null", () => 
        toArray(
            () => null,
        )()
        .then(_m => {
            expect(_m).deep.equals([]);
        })
    );

    it("should put result in an array", () => 
        toArray(
            () => s,
        )()
        .then(_m => {
            expect(_m).deep.equals([s]);
        })
    );

    it("should return Array for multiple results", () =>
        toArray(
            ...matches.map(m => () => m)
        )().then(_m => {
            expect(Array.isArray(_m)).is.true;
            expect(_m).deep.equals(matches)
        })
    );

    it("should spread Multiples", () =>
        toArray(
            () => matches[0],
            () => spreadme,
            () => matches[1],
        )().then(_m => {
            expect(Array.isArray(_m)).is.true;
            expect(_m).deep.equals([
                matches[0],
                spreadme[0],
                spreadme[1],
                matches[1],
            ])
        })
    );
});

describe("fromArray", () => {
    it("should return null for empty array", () => 
        fromArray(
            []
        )
        .then(isNull)
    );

    it("should return first element of array", () => 
        fromArray(
            [13]
        )
        .then(m => {
            expect(m).equals(13);
        })
    );

    it("should pass through non-array", () => 
        fromArray(
            13
        )
        .then(m => {
            expect(m).equals(13);
        })
    );
});