import { describe, expect, passErr, isNull } from './common';
import { Value, sorted, Multiple, pipe, top, best } from '../src/prague';

const matches = [
    new Value("hello", .75),
    new Value("hi", .5),
];

const spreadme = [
    new Value("aloha", .65),
    new Value("wassup", .3),
];

const spreaded = [
    matches[0],
    spreadme[0],
    matches[1],
    spreadme[1],
]

describe("sorted", () => {
    it("should pass through a single result", (done) => {
        const m = new Value("hello", .5);

        sorted(
            () => m,
        )().subscribe(_m => {
            expect(_m).equals(m);
        }, passErr, done);
    });

    it("should emit null on null", (done) => {
        sorted(
            () => null,
        )().subscribe(isNull, passErr, done);
    });

    it("should return Multiple for multiple results", (done) => {
        sorted(
            ...matches.map(m => () => m)
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals(matches)
        }, passErr, done);
    });

    it("should return Multiple in sorted order for sorted results", (done) => {
        sorted(
            ...matches.map(m => () => m)
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals(matches)
        }, passErr, done);
    });

    it("should return Multiple in sorted order for unsorted results", (done) => {
        sorted(
            ...matches.reverse().map(m => () => m)
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals(matches.reverse())
        }, passErr, done);
    });

    it("should spread and sort Multiples", (done) => {
        sorted(
            () => matches[0],
            () => new Multiple(spreadme),
            () => matches[1],
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals([
                matches[0],
                spreadme[0],
                matches[1],
                spreadme[1],
            ])
        }, passErr, done);
    });
});

describe("top", () => {
    it("should default to quantity infinity, tolerance 0", done => {
        pipe(
            () => new Multiple([
                new Value("hi", .5),
                new Value("hello", .5),
                new Value("aloha", .5),
                new Value("wassup", .3),
            ]),
            top(),
        )().subscribe(m => {
            expect(m).instanceof(Multiple);
            expect((m as Multiple).results.length).equals(3);
        }, passErr, done);
    });

    it("should return one item when maxLength == 2 but tolerance is zero", done => {
        pipe(
            () => new Multiple(spreaded),
            top({
                maxResults: 2,
            }),
        )().subscribe(m => {
            expect(m).not.instanceof(Multiple);
            expect(m).equals(matches[0]);
        }, passErr, done);
    });

    it("should return two items when maxLength == 2 but tolerance is .1", done => {
        pipe(
            () => new Multiple(spreaded),
            top({
                maxResults: 2,
                tolerance: .1,
            }),
        )().subscribe(m => {
            expect(m).instanceof(Multiple);
            expect((m as Multiple).results.length).equals(2);
            expect((m as Multiple).results[0]).equals(spreaded[0]);
            expect((m as Multiple).results[1]).equals(spreaded[1]);
        }, passErr, done);
    });

    it("should return all items when tolerance is 1", done => {
        pipe(
            () => new Multiple(spreaded),
            top({
                tolerance: 1,
            }),
        )().subscribe(m => {
            expect(m).instanceof(Multiple);
            expect((m as Multiple).results.length).equals(4);
            expect((m as Multiple).results).deep.equals(spreaded);
        }, passErr, done);
    });
});

describe("best", () => {
    it("should return the top 1 item", done => {
        best(
            () => matches[0],
            () => new Multiple(spreadme),
            () => matches[1],
        )()
        .subscribe(m => {
            expect(m).instanceof(Value);
            expect(m).equals(matches[0]);
        }, passErr, done);
    })
});