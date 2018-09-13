import { expect } from './common';
import { botLogic } from '../samples/simpleBot';
import { ActionReference } from '../src/prague';

class TestContext {
    exited = false;
    sent = '';

    exit = () => { this.exited = true; };
    send = (text: string) => { this.sent = text };

    constructor(public text: string) {}
}

describe("greeting", () => { 

    it("should have a default handler", () =>
        botLogic(new TestContext("hello"))
            .then(m => {
                expect(m).instanceof(ActionReference);
                expect(m.name).equals('default');
            })
    );

    it("should let me introduce myself", () =>
        botLogic(new TestContext("My name is Bill"))
            .then(m => {
                expect(m).instanceof(ActionReference);
                expect(m.name).equals('greet');
                expect(m.args).deep.equals(['Bill']);
            })
    );

})