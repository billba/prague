import { describe, expect, passErr, throwErr } from './common';
import { _bot } from '../samples/simpleBot';
import { defaultIfEmpty } from 'rxjs/operators';
import { ActionReference } from '../src/prague';

class TestContext {
    exited = false;
    sent = '';

    exit = () => { this.exited = true; };
    send = (text: string) => { this.sent = text };

    constructor(public text: string) {}
}

const d = defaultIfEmpty(13);

describe("greeting", () => { 

    it("should have a default handler", done => {
        const c = new TestContext("hello");
        _bot(c)
            .pipe(d)
            .subscribe(m => {
                expect(m).instanceof(ActionReference);
                expect((m as ActionReference).name === 'default')
            }, passErr, done);
    });

})