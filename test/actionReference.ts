import { expect } from './common';
import { ActionReference, ActionReferences, pipe } from '../src/prague';

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
        greeting: async (name: string) => {
            send(`Nice to meet you, ${name}`);
        },
        farewell() {
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

    it("should convert greeting reference to greeting function", () => {
        output = [];

        return pipe(
            (name: string) => actions.reference.greeting(name),
            actions.doAction(sendToOutput),
        )("bill")
        .then(m => {
            expect(output).deep.equals(["Nice to meet you, bill"]);
        });
    });

    it("should convert farewell reference to farewell function", () => {
        output = [];

        return pipe(
            () => actions.reference.farewell(),
            actions.doAction(sendToOutput),
        )()
        .then(m => {
            expect(output).deep.equals(["Goodbye"]);
        });
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
