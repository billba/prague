import { expect, nullablevalues, values, isNull } from './common';
import { from, toPromise } from '../src/prague';

describe("toPromise", () => {
    nullablevalues.forEach(value => {
        it(`should convert ${value} to a promise`, () => {
            const p = toPromise(value);
            expect(p).instanceof(Promise);
            return p.then(n => {
                expect(n).equals(value);
            });
        });

        it(`should pass through Promise<${value}>`, () => {
            const p = Promise.resolve(value)
            expect(toPromise(p)).equals(p);
        });
    });
});

describe("from", () => {
    it("should throw on non-functions", () => {
        expect(() => from("hi" as any)).throws();
    });

    [null, undefined].forEach(value => {
        it(`should emit null on () => ${value}`, () =>
            from(
                () => value
            )()
            .then(isNull)
        );
    })

    values.forEach(value => {
        it(`should return () => Promise of ${value} for () => ${value}`, () =>
            from(
                () => value
            )()
            .then(r => {
                expect(r).equals(value);
            })
        );

        it(`should return () => Promise of ${value} for () => Promise.resolve(${value})`, () =>
            from(
                () => Promise.resolve(value)
            )()
            .then(r => {
                expect(r).equals(value);
            })
        );
    });

    it("should pass through an argument", () =>
        from(
            (a: boolean) => a
        )(true)
        .then(r => {
            expect(r).is.true;
        })
    );

    it("should pass through multiple arguments", () =>
        from(
            (a: string, b: number) => a.repeat(b)
        )("hi", 2)
        .then(r => {
            expect(r).equals("hihi");
        })
    );
});
