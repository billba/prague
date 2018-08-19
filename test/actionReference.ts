import { describe, expect, passErr } from './common';
import { ActionReference, ActionReferences, pipe, run, alwaysEmit, Action } from '../src/prague';

describe("ActionReference", () => {
    it("should create an ActionReference with no args and default options", () => {
        const ar = new ActionReference("bill");
        expect(ar.name).equals("bill");
        expect(ar.score).equals(1);
        expect(ar.source).is.undefined;
        expect(ar.args).deep.equals([]);
    });

    it("should create an ActionReference with args and default options", () => {
        const ar = new ActionReference("bill", 13, "cat");
        expect(ar.name).equals("bill");
        expect(ar.score).equals(1);
        expect(ar.source).is.undefined;
        expect(ar.args).deep.equals([13, "cat"]);
    });

    it("should create an ActionReference with no args", () => {
        const ar = new ActionReference({
            name: "bill",
        });
        expect(ar.name).equals("bill");
        expect(ar.score).equals(1);
        expect(ar.source).is.undefined;
        expect(ar.args).deep.equals([]);
    });

    it("should create an ActionReference with args and default options", () => {
        const ar = new ActionReference({
            name: "bill",
        }, 13, "cat");
        expect(ar.name).equals("bill");
        expect(ar.score).equals(1);
        expect(ar.source).is.undefined;
        expect(ar.args).deep.equals([13, "cat"]);
    });

    it("should create an ActionReference with score and no args", () => {
        const ar = new ActionReference({
            name: "bill",
            score: .5,
        });
        expect(ar.name).equals("bill");
        expect(ar.score).equals(.5);
        expect(ar.source).is.undefined;
        expect(ar.args).deep.equals([]);
    });

    it("should create an ActionReference with source and no args", () => {
        const ar = new ActionReference({
            name: "bill",
            source: "wikipedia",
        });
        expect(ar.name).equals("bill");
        expect(ar.score).equals(1);
        expect(ar.source).equals("wikipedia");
        expect(ar.args).deep.equals([]);
    });

    it("should create an ActionReference with source and score and no args", () => {
        const ar = new ActionReference({
            name: "bill",
            score: .5,
            source: "wikipedia",
        });
        expect(ar.name).equals("bill");
        expect(ar.score).equals(.5);
        expect(ar.source).equals("wikipedia");
        expect(ar.args).deep.equals([]);
    });
});

describe("ActionReferences", () => {
    const actions = new ActionReferences((send: (...args: any[]) => void) => ({
        greeting: (name: string) => {
            send(`Nice to meet you, ${name}`);
            return Promise.resolve();
        },
        farewell: () => {
            send(`Goodbye`);
        },
    }));

    it("should create actions", () => {
        expect(actions).instanceof(ActionReferences);
    });

    it("should create reference.greeting stub", () => {
        const greeting = actions.reference.greeting("bill");
        expect(greeting.name).equals("greeting");
        expect(greeting.args).deep.equals(["bill"]);
    });

    let output: any[];
    let sendToOutput = (... args: any[]) => {
        output = args;
    };

    it("should convert greeting reference to greeting function", (done) => {
        output = [];

        alwaysEmit(
            pipe(
                (name: string) => actions.reference.greeting(name),
                actions.toAction(sendToOutput),
                run,
            )
        )("bill").subscribe(m => {
            expect(m).instanceof(Action);
            expect(output).deep.equals(["Nice to meet you, bill"]);
        }, passErr, done);
    });

    it("should convert farewell reference to farewell function", (done) => {
        output = [];

        alwaysEmit(
            pipe(
                () => actions.reference.farewell(),
                actions.toAction(sendToOutput),
                run,
            )
        )().subscribe(m => {
            expect(m).instanceof(Action);
            expect(output).deep.equals(["Goodbye"]);
        }, passErr, done);
    });
});