import { describe, expect, passErr } from './common';
import { Value, multiple, sort, Multiple, pipe, top, best, Scored, Action } from '../src/prague';
import { matches, rev, spreadme, spreaded } from './multiple';

describe("new Scored", () => {
    const v = new Value("hi");

    it("should default score to 1", () => {
        const s = new Scored(v);
        expect(s.result).equals(v);
        expect(s.score).equals(1);
    });

    it("should use given score", () => {
        const s = new Scored(v, .5);
        expect(s.result).equals(v);
        expect(s.score).equals(.5);
    });

    it("should throw on score of 0", () => {
        expect(() => new Scored(v, 0)).throws;
    });

    it("should throw on score > 1", () => {
        expect(() => new Scored(v, 1.5)).throws;
    });
});

describe("Scored.from", () => {

    const v = new Value("hi");
    const a = new Action(() => {});

    it("should return null on null", () => {
        expect(Scored.from(null)).is.null;
    });

    it("should return null on undefined", () => {
        expect(Scored.from(null)).is.null;
    });

    it("should return null when score is 0", () => {
        expect(Scored.from(v, 0)).is.null;
    });

    it("should wrap Value<string>", () => {
        const s = Scored.from(v);
        expect(s.result).equals(v);
        expect(s.score).equals(1);
    });

    it("should wrap string as Value<string>", () => {
        const s = Scored.from("Hi");
        expect(s.result).instanceof(Value);
        expect(s.result.value).equals("Hi");
        expect(s.score).equals(1);
    });

    it("should wrap Action", () => {
        const s = Scored.from(a);
        expect(s.result).equals(a);
        expect(s.score).equals(1);
    });

    it("should wrap function as Action", done => {
        let handled = false;
        const s = Scored.from(() => {
            handled = true;
        });

        expect(s.result).instanceof(Action);
        expect(s.score).equals(1);

        s.result.action().subscribe(() => {
            expect(handled).is.true;
        }, passErr, done);
    });

    it("should return supplied Scored when score is undefined", () => {
        const sv = Scored.from(v);
        expect(Scored.from(sv)).equals(sv);
    });

    it("should return supplied Scored when scores are the same", () => {
        const sv = Scored.from(v, .5);
        expect(Scored.from(sv, .5)).equals(sv);
    });

    it("should return new Scored when scores are different", () => {
        const sv = Scored.from(v, .5);
        const s = Scored.from(sv, .75);
        expect(s).does.not.equal(sv);
        expect(s.result).equals(sv.result);
        expect(s.score).equals(.75);
    });

    it("should cap score to 1 for Scored of 1", () => {
        const sv = Scored.from(v);
        const s = Scored.from(sv, 1.5);
        expect(s).equals(sv);
    });

    it("should cap score to 1 for Scored of not 1", () => {
        const sv = Scored.from(v, .5);
        const s = Scored.from(sv, 1.5);
        expect(s).does.not.equal(sv);
        expect(s.score).equals(1);
    });

    it("should cap score to 1 for non-Scored", () => {
        const s = Scored.from(v, 1.5);
        expect(s.score).equals(1);
    });
});

describe("Scored.unwrap", () => {
    const v = new Value("hi");
    const sv = Scored.from(v);

    it("should return result of Scored", () => {
        expect(Scored.unwrap(sv)).equals(v);
    });

    it("should return non-Scored result", () => {
        expect(Scored.unwrap(v)).equals(v);
    })
});

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
                Scored.from("hi", .5),
                Scored.from("hello", .5),
                Scored.from("aloha", .5),
                Scored.from("wassup", .3),
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
