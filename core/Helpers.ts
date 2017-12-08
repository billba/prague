import { Router, FirstRouter, BestRouter, IfMatches, IfTrue, Matcher, Observableable, toObservable, Predicate, SwitchRouter, predicateToMatcher } from './Router';
import { Observable } from 'rxjs';

export class IfMatchesThen <ROUTABLE, VALUE> extends IfMatches<ROUTABLE, VALUE> {
    constructor(
        matcher: Matcher<ROUTABLE, VALUE>,
        getThenRouter: (routable: ROUTABLE, value: VALUE) => Router<ROUTABLE>
    ) {
        super(matcher, getThenRouter, (routable, reason) => Router.no(reason));
    }

    elseDo(elseHandler: (routable: ROUTABLE, reason: string) => Observableable<any>) {
        return this.elseTry((_routable, reason) => Router.do(routable => elseHandler(routable, reason)));
    }

    elseTry(elseRouter: Router<ROUTABLE>): IfMatches<ROUTABLE, VALUE>;
    elseTry(getElseRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>): IfMatches<ROUTABLE, VALUE>;
    elseTry(arg: Router<ROUTABLE> | ((routable: ROUTABLE, reason: string) => Router<ROUTABLE>)) {
        return new IfMatches(this.matcher, this.getThenRouter, typeof(arg) === 'function'
            ? arg
            : (routable, reason) => arg
        );
    }
}

export class IfMatchesFluent <ROUTABLE, VALUE> {
    constructor (
        private matcher: Matcher<ROUTABLE, VALUE>
    ) {
    }

    and (predicate: (value: VALUE) => IfTrueFluent<ROUTABLE>): IfMatchesFluent<ROUTABLE, VALUE>;
    and (predicate: IfTrueFluent<ROUTABLE>): IfMatchesFluent<ROUTABLE, VALUE>;
    and <TRANSFORMRESULT> (recognizer: (value: VALUE) => IfMatchesFluent<ROUTABLE, TRANSFORMRESULT>): IfMatchesFluent<ROUTABLE, TRANSFORMRESULT>;
    and <TRANSFORMRESULT> (recognizer: IfMatchesFluent<ROUTABLE, TRANSFORMRESULT>): IfMatchesFluent<ROUTABLE, TRANSFORMRESULT>;
    and <TRANSFORMRESULT> (arg) {
        const recognizer = typeof(arg) === 'function'
            ? arg as (value: VALUE) => IfMatchesFluent<ROUTABLE, any>
            : (value: VALUE) => arg as IfMatchesFluent<ROUTABLE, any>;
        return new IfMatchesFluent((routable: ROUTABLE) => toObservable(this.matcher(routable))
            .map(response => IfMatches.normalizeMatcherResponse<VALUE>(response))
            .flatMap(match => IfMatches.isMatch(match)
                ? toObservable(recognizer(match.value))
                    .flatMap(_ifMatches => toObservable(_ifMatches.matcher(routable))
                        .map(_response => IfMatches.normalizeMatcherResponse(_response))
                        .map(_match => IfMatches.isMatch(_match)
                            ? _ifMatches instanceof IfTrueFluent
                                ? match
                                : {
                                    value: _match.value,
                                    score: Router.combineScore(match.score, _match.score)
                                }
                            : _match
                        )
                    )
                : Observable.of(match)
            )
        );
    }

    thenDo(thenHandler: (routable: ROUTABLE, value: VALUE) => Observableable<any>) {
        return this.thenTry((_routable, value) => Router.do(routable => thenHandler(routable, value)));
    }

    thenTry(router: Router<ROUTABLE>): IfMatchesThen<ROUTABLE, VALUE>;
    thenTry(getRouter: (routable: ROUTABLE, value: VALUE) => Router<ROUTABLE>): IfMatchesThen<ROUTABLE, VALUE>;
    thenTry(arg: Router<ROUTABLE> | ((routable: ROUTABLE, value: VALUE) => Router<ROUTABLE>)) {
        return new IfMatchesThen(this.matcher, typeof arg === 'function'
            ? arg
            : (routable, value) => arg
        );
    }
}

export class IfTrueFluent <ROUTABLE> extends IfMatchesFluent<ROUTABLE, boolean> {
    constructor(
        predicate: Predicate<ROUTABLE>
    ) {
        super(predicateToMatcher(predicate));
    }
}

export class Helpers <ROUTABLE> {
    tryInOrder (... routers:  Router<ROUTABLE>[]) {
        return new FirstRouter(... routers);
    }

    tryInScoreOrder (... routers: Router<ROUTABLE>[]) {
        return new BestRouter(... routers);
    }

    ifMatches <VALUE>(matcher: Matcher<ROUTABLE, VALUE>) {
        return new IfMatchesFluent(matcher);
    }

    ifTrue (predicate: Predicate<ROUTABLE>) {
        return new IfTrueFluent(predicate);
    }

    route (routable: ROUTABLE, router: Router<ROUTABLE>) {
        return router.route(routable);
    }

    trySwitch(
        getKey: (routable: ROUTABLE) => Observableable<string>,
        mapKeyToRouter: Record<string, Router<ROUTABLE>>
    ) {
        return new SwitchRouter(getKey, mapKeyToRouter);
    }
}
