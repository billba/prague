import { Observable } from 'rxjs';
import { Message } from 'botframework-directlinejs';
import { BrowserBot } from './BrowserBot';

const browserBot = new BrowserBot()

window["browserBot"] = browserBot.botConnection;

browserBot.chatConnector.activity$
.filter(activity => activity.type === 'message')
.flatMap(activity => browserBot.chatConnector.postActivity({
    type: 'message',
    from: { id: 'browserBot'},
    text: `Echo: ${(activity as Message).text}`
})).subscribe();

Observable.timer(1000,5000)
.flatMap(i => browserBot.chatConnector.postActivity({
    type: 'message',
    from: { id: 'browserBot'},
    text: `hello, world #${i}`
})).subscribe();

