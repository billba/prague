import { expect, isNull } from './common';
import { multiple, Scored } from '../src/prague';

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

describe("multiple", () => {
    it("should pass through a single result", () => {
        const m = "hi";

        return multiple(
            () => m,
        )()
        .then(_m => {
            expect(_m).equals(m);
        });
    });

    it("should emit null on null", () =>
        multiple(
            () => null,
        )()
        .then(isNull)
    );

    it("should return Array for multiple results", () =>
        multiple(
            ...matches.map(m => () => m)
        )().then(_m => {
            expect(Array.isArray(_m)).is.true;
            expect(_m).deep.equals(matches)
        })
    );

    it("should spread Multiples", () =>
        multiple(
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
