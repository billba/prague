import { Router, Helpers, FirstRouter, BestRouter, IfMatches, MatchSuccess, MatchFailure, IfTrue } from 'prague';
import { Observable } from 'rxjs';
import { Bot } from 'botbuilder-core';

class BotRouter extends Router<BotContext> {}

export const { tryInOrder, tryInScoreOrder, ifMatches, ifTrue, route } = new Helpers<BotContext>();
export { BotRouter as Router }

export const ifMessage = () => ifTrue(c => c.request.type === 'message' || { reason: "ifMessage"});

export const ifText = () => ifMessage()
    .and(ifMatches(c => c.request.text.length > 0
        ? { value: c.request.text}
        : { reason: 'ifText' }
    ));

export const ifRegExp = (regexp: RegExp) => ifText()
    .and(text => ifMatches(c => {
        const matches = regexp.exec(text);
        return matches
            ? { value: matches }
            : { reason: "ifRegExp" }
    }));

export const ifNumber = () => ifText()
    .and(text => ifMatches(c => {
        const number = Number(text);
        return isNaN(number)
            ? { reason: 'ifNumber' }
            : { value: number }
    }));
