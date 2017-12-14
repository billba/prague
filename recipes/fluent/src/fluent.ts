import { konsole, Matcher, Observableable, toObservable, Predicate, Handler, GetRoute$, Router } from './FluentRouter';
import { Observable } from 'rxjs';

export * from './FluentRouter';

export class IfMatchesThen <ROUTABLE, VALUE> extends Router<ROUTABLE> {
    constructor(
        private matcher: Matcher<ROUTABLE, VALUE>,
        private getThenRouter: (routable: ROUTABLE, value: VALUE) => Router<ROUTABLE>
    ) {
        super(Router.getRouteIfMatches$(matcher, getThenRouter));
    }

    elseDo(elseHandler: (routable: ROUTABLE, reason: string) => Observableable<any>) {
        return this.elseTry((_routable, reason) => Router.do(routable => elseHandler(routable, reason)));
    }

    elseTry(elseRouter: Router<ROUTABLE>): Router<ROUTABLE>;
    elseTry(getElseRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>): Router<ROUTABLE>;
    elseTry(arg: Router<ROUTABLE> | ((routable: ROUTABLE, reason: string) => Router<ROUTABLE>)) {
        return new Router(Router.getRouteIfMatches$(this.matcher, this.getThenRouter, typeof(arg) === 'function'
            ? arg
            : (routable, reason) => arg
        ));
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
            .map(response => Router.normalizeMatchResult<VALUE>(response))
            .flatMap(matchResult => Router.isMatch(matchResult)
                ? toObservable(recognizer(matchResult.value))
                    .flatMap(_ifMatches => toObservable(_ifMatches.matcher(routable))
                        .map(_response => Router.normalizeMatchResult(_response))
                        .map(_matchResult => Router.isMatch(_matchResult)
                            ? _ifMatches instanceof IfTrueFluent
                                ? matchResult
                                : {
                                    value: _matchResult.value,
                                    score: Router.combineScore(matchResult.score, _matchResult.score)
                                }
                            : _matchResult
                        )
                    )
                : Observable.of(matchResult)
            )
        );
    }

    thenDo(
        thenHandler: (routable: ROUTABLE, value: VALUE) => Observableable<any>,
        score?: number
    ) {
        return this.thenTry((_routable, value) => Router.do(routable => thenHandler(routable, value), score));
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
        super(Router.predicateToMatcher(predicate));
    }
}

export class Helpers <ROUTABLE> {
    tryInOrder (... routers: Router<ROUTABLE>[]) {
        return new Router(Router.getRouteFirst$(... routers));
    }

    tryInScoreOrder (... routers: Router<ROUTABLE>[]) {
        return new Router(Router.getRouteBest$(... routers));
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
        return new Router(Router.getRouteSwitch$(getKey, mapKeyToRouter));
    }
}

