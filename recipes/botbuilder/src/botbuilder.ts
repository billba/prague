import { Router, Helpers, FirstRouter, BestRouter, IfMatches, MatchSuccess, MatchFailure, IfTrue } from 'prague';
import { Observable } from 'rxjs';
import { Bot } from 'botbuilder-core';

class BotRouter extends Router<BotContext> {}

export const { tryInOrder, tryInScoreOrder, ifMatches, ifTrue } = new Helpers<BotContext>();
export { BotRouter as Router }


export const ifMessage = () => ifTrue(c => c.request.type === 'message' || { reason: "ifMessage"});

export const ifText = () => ifMessage()
    .and(ifMatches(c => c.request.text.length > 0
        ? { value: c.request.text}
        : { reason: 'ifText' }
    ));

export const ifRegExp = (regexp: RegExp) => ifText()
    .and(text => ifMatches(c => regexp.exec(text)));
