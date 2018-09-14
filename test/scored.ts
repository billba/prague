import { expect } from './common';
import { toArray, sort, pipe, top, best, Scored } from '../src/prague';
import { matches, rev, spreadme, spreaded } from './multiple';

describe("Scored.from", () => {

    const v = "hi";
    const a = () => {};

    it("should return null on null", () => {
        expect(Scored.from(null)).is.null;
    });

    it("should return null on null with score", () => {
        expect(Scored.from(null, .5)).is.null;
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
        expect(s.result).equals("Hi");
        expect(s.score).equals(1);
    });

    it("should wrap Action", () => {
        const s = Scored.from(a);
        expect(s.result).equals(a);
        expect(s.score).equals(1);
    });

    it("should wrap function", () => {
        const s = Scored.from(() => {});

        expect(typeof s.result).equals("function");
        expect(s.score).equals(1);
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
    const v = "hi";
    const sv = Scored.from(v);
    
    it("should return result of Scored", () => {
        expect(Scored.unwrap(sv)).equals(v);
    });

    it("should return non-Scored result", () => {
        expect(Scored.unwrap(v)).equals(v);
    });
});

describe("sort", () => {
    it("should return Array in sorted order for sorted results", () =>
        pipe(
            toArray(...matches.map(m => () => m)),
            sort(),
        )().then(_m => {
            expect(Array.isArray(_m)).is.true;
            expect(_m).deep.equals(matches)
        })
    );

    it("should return Array in sorted order for unsorted results", () =>
        pipe(
            toArray(...rev.map(m => () => m)),
            sort(),
        )().then(_m => {
            expect(Array.isArray(_m)).is.true;
            expect(_m).deep.equals(matches);
        })
    );

    it("should return Array in reverse sorted order for unsorted results", () =>
        pipe(
            toArray(...rev.map(m => () => m)),
            sort(true),
        )().then(_m => {
            expect(Array.isArray(_m)).is.true;
            expect(_m).deep.equals(rev);
        })
    );
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

    it("should default to quantity infinity, tolerance 0", () =>
        pipe(
            () => [
                Scored.from("hi", .5),
                Scored.from("hello", .5),
                Scored.from("aloha", .5),
                Scored.from("wassup", .3),
            ],
            top(),
        )().then(m => {
            expect(Array.isArray(m)).is.true;
            expect(m.length).equals(3);
        })
    );

    it("should return one item when maxLength == 2 but tolerance is zero", () =>
        pipe(
            () => spreaded,
            sort(),
            top({
                maxResults: 2,
            }),
        )().then(m => {
            expect(m).deep.equals([matches[0]]);
        })
    );

    it("should return two items when maxLength == 2 but tolerance is .1", () =>
        pipe(
            () => spreaded,
            sort(),
            top({
                maxResults: 2,
                tolerance: .1,
            }),
        )().then(m => {
            expect(m).deep.equals([
                spreaded[0],
                spreaded[1]
            ]);
        })
    );

    it("should return all items when tolerance is 1", () =>
        pipe(
            () => spreaded,
            sort(),
            top({
                tolerance: 1,
            }),
        )().then(m => {
            expect(m).deep.equals(spreaded);
        })
    );
});

describe("best", () => {
    it("should return the top 1 item", () =>
        best(
            () => matches[0],
            () => spreadme,
            () => matches[1],
        )()
        .then(m => {
            expect(m).equals(matches[0].result);
        })
    )
});
