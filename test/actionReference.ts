import { expect, passErr, throwErr } from './common';
import { ActionReference, ActionReferences, pipe, doAction } from '../src/prague';

describe("ActionReference", () => {
    it("should create an ActionReference with no args", () => {
        const ar = new ActionReference("bill");
        expect(ar.name).equals("bill");
        expect(ar.args).deep.equals([]);
    });

    it("should create an ActionReference with args", () => {
        const ar = new ActionReference("bill", 13, "cat");
        expect(ar.name).equals("bill");
        expect(ar.args).deep.equals([13, "cat"]);
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
        expect(greeting).instanceof(ActionReference);
        expect(greeting.name).equals("greeting");
        expect(greeting.args).deep.equals(["bill"]);
    });

    let output: any[];
    let sendToOutput = (... args: any[]) => {
        output = args;
    };

    it("should convert greeting reference to greeting function", (done) => {
        output = [];

        pipe(
            (name: string) => actions.reference.greeting(name),
            actions.referenceToAction(sendToOutput),
            doAction,
        )("bill").subscribe(m => {
            expect(m).instanceof(Action);
            expect(output).deep.equals(["Nice to meet you, bill"]);
        }, passErr, done);
    });

    it("should convert farewell reference to farewell function", (done) => {
        output = [];

        pipe(
            () => actions.reference.farewell(),
            actions.referenceToAction(sendToOutput),
            doAction,
        )().subscribe(m => {
            expect(m).instanceof(Action);
            expect(output).deep.equals(["Goodbye"]);
        }, passErr, done);
    });

    it("should throw on unknown name", () => {
        expect(actions.reference.greeting("dog")).throws;
    });

    it("should create scored reference.greeting stub", () => {
        const greeting = actions.scoredReference.greeting(.5, "bill");
        expect(greeting.score).equals(.5);
        expect(greeting.result).instanceof(ActionReference);
        expect(greeting.result.name).equals("greeting");
        expect(greeting.result.args).deep.equals(["bill"]);
    });

});
