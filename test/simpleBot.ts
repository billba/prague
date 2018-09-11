import { expect } from './common';
import { _bot } from '../samples/simpleBot';
import { ActionReference } from '../src/prague';

class TestContext {
    exited = false;
    sent = '';

    exit = () => { this.exited = true; };
    send = (text: string) => { this.sent = text };

    constructor(public text: string) {}
}

describe("greeting", () => { 

    it("should have a default handler", () => {
        const c = new TestContext("hello");
        return _bot(c)
            .then(m => {
                expect(m).instanceof(ActionReference);
                expect((m as ActionReference).name).equals('default');
            });
    });

    it("should let me introduce myself", () => {
        const c = new TestContext("My name is Bill");
        return _bot(c)
            .then(m => {
                expect(m).instanceof(ActionReference);
                expect((m as ActionReference).name).equals('greet');
                expect((m as ActionReference).args).deep.equals(['Bill']);
            });
    });

})