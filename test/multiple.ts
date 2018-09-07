import { describe, expect, passErr, isNull } from './common';
import { multiple, Multiple, Scored } from '../src/prague';
import { defaultIfEmpty } from 'rxjs/operators';

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
    it("should pass through a single result", (done) => {
        const m = Scored.from("hello", .5);

        multiple(
            () => m,
        )().subscribe(_m => {
            expect(_m).equals(m);
        }, passErr, done);
    });

    it("should emit null on null", (done) => {
        multiple(
            () => null,
        )()
        .pipe(defaultIfEmpty(13))
        .subscribe(isNull, passErr, done);
    });

    it("should return Multiple for multiple results", (done) => {
        multiple(
            ...matches.map(m => () => m)
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals(matches)
        }, passErr, done);
    });

    it("should spread Multiples", (done) => {
        multiple(
            () => matches[0],
            () => new Multiple(spreadme),
            () => matches[1],
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals([
                matches[0],
                spreadme[0],
                spreadme[1],
                matches[1],
            ])
        }, passErr, done);
    });
});
