import { expect, throwErr, isNull } from './common';
import { tube, run, tap, pipe, doAction } from '../src/prague';

describe("pipe", () => {

    it('should emit null when first transform emits null', () =>
        tube(
            () => undefined,
        )()
        .then(isNull)
    );

    it('should emit null and not call second transform when first transform emits null', () =>
        tube(
            () => undefined,
            throwErr,
        )()
        .then(isNull)
    );

    it('should emit null when second transform emits null', () =>
        tube(
            () => "hi",
            () => undefined,
        )()
        .then(isNull)
    );

    it('should pass through argument to first transform', () =>
        tube(
            (a: string) => a,
        )("hi")
        .then(m => {
            expect(m).equals("hi");
        })
    );

    it('should pass through multiple arguments to first transform', () =>
        tube(
            (a: string, b: number) => a.repeat(b),
        )("hi", 2)
        .then(m => {
            expect(m).equals("hihi");
        })
    );

    it('should pass result of first transform to second transform', () =>
        tube(
            (a: string, b: number) => a.repeat(b),
            a => a,
        )("hi", 2)
        .then(m => {
            expect(m).equals("hihi");
        })
    );

    it('should pass result of second transform to third transform', () =>
        tube(
            (a: string, b: number) => a.repeat(b),
            a => a,
            a => a,
        )("hi", 2)
        .then(m => {
            expect(m).equals("hihi");
        })
    );

    it('should short circuit on second null', () =>
        tube(
            (a: string, b: number) => a.repeat(b),
            a => null,
            throwErr,
        )("hi", 2)
        .then(isNull)
    );
});

describe("tap", () => {
    it("should get the result of the previous function, and pass through to following function", () => {
        let handled = "no";

        return tube(
            (a: string, b: number) => a.repeat(b),
            tap(a => {
                handled = a;
            }),
            a => a,
        )("hi", 2)
        .then(m => {
            expect(handled).to.equal("hihi");
            expect(m).to.equal("hihi");
        });
    });
});

describe("doAction", () => {
    it("should ignore non-function result", () =>
        tube(
            (a: string, b: number) => a.repeat(b),
            doAction,
        )("hi", 2).then(m => {
            expect(m).to.equal("hihi");
        })
    );

    it("should do function", () => {
        let handled = "no";

        return tube(
            (a: string) => () => {
                handled = a;
            },
            doAction,
        )("hi").then(m => {
            expect(handled).equals("hi");
            expect(typeof m).equals("function");
        });
    });
});

describe("run", () => {
    it("should ignore non-action result", () =>
        run(
            (a: string, b: number) => a.repeat(b)
        )("hi", 2).then(m => {
            expect(m).to.equal("hihi");
        })
    );

    it("should do function", () => {
        let handled = "no";

        return run(
            (a: string) => () => {
                handled = a;
            }
        )("hi").then(m => {
            expect(handled).equals("hi");
            expect(typeof m).equals("function");
        });
    });
});

describe("combine", () => {

    it('should emit null when first transform emits null', () =>
        pipe(
            () => undefined,
        )()
        .then(isNull)
    );

    it('should emit null when second transform emits null', () =>
        pipe(
            () => "hi",
            () => undefined,
        )()
        .then(isNull)
    );

    it('should pass through argument to first transform', () =>
        pipe(
            (a: string) => a,
        )("hi").then(m => {
            expect(m).equals("hi");
        })
    );

    it('should pass through multiple arguments to first transform', () =>
        pipe(
            (a: string, b: number) => a.repeat(b),
        )("hi", 2).then(m => {
            expect(m).equals("hihi");
        })
    );

    it('should pass result of first transform to second transform', () =>
        pipe(
            (a: string, b: number) => a.repeat(b),
            a => a,
        )("hi", 2).then(m => {
            expect(m).equals("hihi");
        })
    );
});