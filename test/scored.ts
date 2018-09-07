import { describe, expect, passErr } from './common';
import { Value, multiple, sort, Multiple, pipe, top, best, scoredValue } from '../src/prague';
import { matches, rev, spreadme, spreaded } from './multiple';

describe("sort", () => {
    it("should return Multiple in sorted order for sorted results", (done) => {
        pipe(
            multiple(...matches.map(m => () => m)),
            sort(),
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals(matches)
        }, passErr, done);
    });

    it("should return Multiple in sorted order for unsorted results", (done) => {
        pipe(
            multiple(...rev.map(m => () => m)),
            sort(),
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals(matches);
        }, passErr, done);
    });

    it("should return Multiple in reverse sorted order for unsorted results", (done) => {
        pipe(
            multiple(...rev.map(m => () => m)),
            sort(true),
        )().subscribe(_m => {
            expect(_m).instanceof(Multiple);
            expect((_m as Multiple).results).deep.equals(rev);
        }, passErr, done);
    });
});

describe("top", () => {
    it("should throw on non-number maxResults", () => {
        expect(
            () => top({
                maxResults: 'bill' as unknown as number,
            })
        ).throws();
    });

    it("should throw on non-number tolerance", () => {
        expect(
            () => top({
                tolerance: 'bill' as unknown as number,
            })
        ).throws();
    });

    it("should throw on maxResults < 1", () => {
        expect(
            () => top({
                maxResults: 0.5,
            })
        ).throws();
    });

    it("should throw on tolerance < 0", () => {
        expect(
            () => top({
                tolerance: -5,
            })
        ).throws();
    });

    it("should throw on tolerance > 1", () => {
        expect(
            () => top({
                tolerance: 5,
            })
        ).throws();
    });

    it("should default to quantity infinity, tolerance 0", done => {
        pipe(
            () => new Multiple([
                scoredValue("hi", .5),
                scoredValue("hello", .5),
                scoredValue("aloha", .5),
                scoredValue("wassup", .3),
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
            sort(),
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
            sort(),
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
            sort(),
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
            expect(m).equals(matches[0].result);
        }, passErr, done);
    })
});
