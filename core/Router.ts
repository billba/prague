import { konsole } from './Konsole';
import { Observable } from 'rxjs';

export type Observableable <T> = T | Observable<T> | Promise<T>;

export function toObservable <T> (t: Observableable<T>) {
    if (t instanceof Observable)
        return t;
    if (t instanceof Promise)
        return Observable.fromPromise<T> (t);
    return Observable.of(t);
}

export interface ActionRoute {
    type: 'action';
    action: () => Observableable<any>;
    score: number;
}

export interface NoRoute {
    type: 'no';
    reason: string;
}

export type Route = ActionRoute | NoRoute;

export type Routable = object;

export type Handler <ROUTABLE> =
    (routable: ROUTABLE) => Observableable<any>;

export class Router <ROUTABLE> {
    constructor(public getRoute$: (routable: ROUTABLE) => Observable<Route>) {}

    static actionRoute (
        action: () => Observableable<any>,
        score: number = 1
    ) {
        return {
            type: 'action',
            action,
            score
        } as ActionRoute;
    }

    static do <ROUTABLE> (
        handler: Handler<ROUTABLE>,
        score?: number
    ) {
        return new Router<ROUTABLE>(routable => Observable.of(Router.actionRoute(() => handler(routable), score)));
    }
    
    static noop <ROUTABLE> (handler: Handler<ROUTABLE>) {
        return new RunRouter(handler);
    }
    
    static noRoute (reason: string = "none") {
        return {
            type: 'no',
            reason
        } as NoRoute;
    }

    static no (reason?: string) {
        return new Router<any>(routable => Observable.of(Router.noRoute(reason)));
    }

    route$ (routable: ROUTABLE) {
        return this
            .getRoute$(routable)
            .do(route => konsole.log("route: returned a route", route))
            .flatMap(route => route.type === 'action'
                ? toObservable(route.action())
                    .do(_ => konsole.log("route: called action"))
                    .map(_ => true)
                : Observable.of(false)
            );
    }

    route (routable: ROUTABLE) {
        return this.route$(routable)
            .toPromise();
    }

    beforeDo (handler: Handler<ROUTABLE>) {
        return new BeforeRouter<ROUTABLE>(handler, this);
    }

    afterDo (handler: Handler<ROUTABLE>) {
        return new AfterRouter<ROUTABLE>(handler, this);
    }

    defaultDo (handler: (routable: ROUTABLE, reason: string) => Observableable<any>) {
        return this.defaultTry(reason => Router.do(routable => handler(routable, reason)));
    }

    defaultTry (getRouter: (reason: string) => Router<ROUTABLE>): Router<ROUTABLE>;
    defaultTry (router: Router<ROUTABLE>): Router<ROUTABLE>;
    defaultTry (arg) {
        return new DefaultRouter<ROUTABLE>(this, typeof(arg) === 'function'
            ? arg
            : reason => arg
        );
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
        return new IfMatches(matcher);
    }

    ifTrue (predicate: Predicate<ROUTABLE>) {
        return new IfTrue(predicate);
    }
}

export class FirstRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor (... routers: Router<ROUTABLE>[]) {
        super(routable => Observable.from(routers)
            .filter(router => !!router)
            .concatMap((router, i) => {
                konsole.log(`first: trying router #${i}`);
                return router
                    .getRoute$(routable)
                    .do(route => konsole.log(`first: router #${i} returned route`, route));
            })
            .filter(route => route.type === 'action')
            .take(1) // so that we don't keep going through routers after we find one that matches;
            .defaultIfEmpty(Router.noRoute('tryInOrder'))
        );
    }
}

export class BestRouter <ROUTABLE> extends Router<ROUTABLE> {
    private static minRoute = Router.actionRoute(
        () => {
            console.warn("BestRouter.minRoute.action should never be called");
        },
        0
    );
    
    constructor(... routers: Router<ROUTABLE>[]) {
        super(routable => new Observable<Route>(observer => {
            let bestRoute = BestRouter.minRoute;

            const subscription = Observable.from(routers)
                .filter(router => !!router)
                .takeWhile(_ => bestRoute.score < 1)
                .concatMap(router => router.getRoute$(routable))
                .filter(route => route.type === 'action')
                .defaultIfEmpty(Router.noRoute('tryInScoreOrder'))
                .subscribe(
                    (route: ActionRoute) => {
                        if (route.score > bestRoute.score) {
                            bestRoute = route;
                            if (bestRoute.score === 1) {
                                observer.next(bestRoute);
                                observer.complete();
                            }
                        }
                    },
                    error =>
                        observer.error(error),
                    () => {
                        if (bestRoute.score > 0)
                            observer.next(bestRoute);
                        observer.complete();
                    }
                );

            return () => subscription.unsubscribe();
        }));
    }
}

export class RunRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor(handler: Handler<ROUTABLE>) {
        super(routable => toObservable(handler(routable))
            .map(_ => Router.noRoute('noop'))
        );
    }
}

export interface MatchSuccess <VALUE> {
    value: VALUE;
    score?: number;
}

export interface MatchFailure <VALUE> {
    value?: VALUE;
    reason: string;
}

export type Match <VALUE> = MatchSuccess<VALUE> | MatchFailure<VALUE>;

export type Matcher <ROUTABLE, VALUE> = (routable: ROUTABLE) => Observableable<Match<VALUE> | VALUE>;

function combineScore(score, otherScore) {
    return score * otherScore
}

export function routeWithCombinedScore(route: ActionRoute, newScore: number) {
    const score = combineScore(newScore, route.score);

    return route.score === score
        ? route
        : {
            ... route,
            score
        } as Route;
}

export class IfMatchesElse <ROUTABLE, VALUE> extends Router<ROUTABLE> {
    constructor(
        private matcher: Matcher<ROUTABLE, VALUE>,
        private getThenRouter: (value: VALUE) => Router<ROUTABLE>,
        private getElseRouter: (reason: string) => Router<ROUTABLE>
    ) {
        super(routable => toObservable(matcher(routable))
            .map(response => IfMatches.normalizeMatcherResponse<VALUE>(response))
            .flatMap(match => IfMatches.matchIsSuccess(match)
                ? getThenRouter(match.value)
                    .getRoute$(routable)
                    .map(route => route.type === 'action'
                        ? routeWithCombinedScore(route, match.score)
                        : route
                    )
                : getElseRouter(match.reason)
                    .getRoute$(routable)
            )
        );
    }
}

export class IfMatchesThen <ROUTABLE, VALUE = any> extends Router<ROUTABLE> {
    constructor(
        private matcher: Matcher<ROUTABLE, VALUE>,
        private getThenRouter: (value: VALUE) => Router<ROUTABLE>
    ) {
        super(routable => toObservable(matcher(routable))
            .map(response => IfMatches.normalizeMatcherResponse<VALUE>(response))
            .flatMap(match => IfMatches.matchIsSuccess(match)
                ? getThenRouter(match.value)
                    .getRoute$(routable)
                    .map(route => route.type === 'action'
                        ? routeWithCombinedScore(route, match.score)
                        : route
                    )
                : Observable.of(Router.noRoute(match.reason))
            )
        );
    }

    elseDo(elseHandler: (routable: ROUTABLE, reason: string) => Observableable<any>) {
        return this.elseTry(reason => Router.do(routable => elseHandler(routable, reason)));
    }

    elseTry(elseRouter: Router<ROUTABLE>): IfMatchesElse<ROUTABLE, VALUE>;
    elseTry(getElseRouter: (reason: string) => Router<ROUTABLE>): IfMatchesElse<ROUTABLE, VALUE>;
    elseTry(arg) {
        return new IfMatchesElse(this.matcher, this.getThenRouter, typeof(arg) === 'function'
            ? arg
            : reason => arg
        );
    }
}

export class IfMatches <ROUTABLE, VALUE> {
    constructor (
        private matcher: Matcher<ROUTABLE, VALUE>
    ) {
    }

    static matchIsSuccess <VALUE> (match: Match<any>): match is MatchSuccess<VALUE> {
        return ((match as any).reason === undefined);
    }
    
    and (predicate: (value: VALUE) => IfTrue<ROUTABLE>): IfMatches<ROUTABLE, VALUE>;
    and (predicate: IfTrue<ROUTABLE>): IfMatches<ROUTABLE, VALUE>;
    and <TRANSFORMRESULT> (recognizer: (value: VALUE) => IfMatches<ROUTABLE, TRANSFORMRESULT>): IfMatches<ROUTABLE, TRANSFORMRESULT>;
    and <TRANSFORMRESULT> (recognizer: IfMatches<ROUTABLE, TRANSFORMRESULT>): IfMatches<ROUTABLE, TRANSFORMRESULT>;
    and <TRANSFORMRESULT> (arg) {
        const recognizer = typeof(arg) === 'function'
            ? arg as (value: VALUE) => IfMatches<ROUTABLE, any>
            : (value: VALUE) => arg as IfMatches<ROUTABLE, any>;
        return new IfMatches((routable: ROUTABLE) => toObservable(this.matcher(routable))
            .map(response => IfMatches.normalizeMatcherResponse<VALUE>(response))
            .flatMap(match => IfMatches.matchIsSuccess(match)
                ? toObservable(recognizer(match.value))
                    .flatMap(_ifMatches => toObservable(_ifMatches.matcher(routable))
                        .map(_response => IfMatches.normalizeMatcherResponse(_response))
                        .map(_match => IfMatches.matchIsSuccess(_match)
                            ? _ifMatches instanceof IfTrue
                                ? match
                                : {
                                    value: _match.value,
                                    score: combineScore(match.score, _match.score)
                                }
                            : _match
                        )
                    )
                : Observable.of(match)
            )
        );
    }

    thenDo(thenHandler: (routable: ROUTABLE, value: VALUE) => Observableable<any>) {
        return this.thenTry(value => Router.do(routable => thenHandler(routable, value)));
    }

    thenTry(router: Router<ROUTABLE>): IfMatchesThen<ROUTABLE, VALUE>;
    thenTry(getRouter: (value: VALUE) => Router<ROUTABLE>): IfMatchesThen<ROUTABLE, VALUE>;
    thenTry(arg) {
        return new IfMatchesThen(this.matcher, typeof arg === 'function'
            ? arg
            : value => arg
        );
    }

    static defaultReason = "none";

    static normalizeMatcherResponse <VALUE> (response: any): Match<VALUE> {
        if (!response)
            return {
                reason: IfMatches.defaultReason
            }

        if (typeof(response) === 'object') {
            if (response.reason) {
                if (typeof(response.reason) !== 'string')
                    throw new Error('The reason for NoMatch must be a string');
                return {
                    reason: response.reason
                }
            }

            if (response.value !== undefined) {
                if (response.score !== undefined && typeof(response.score) !== 'number')
                    throw new Error('The score for Match must be a number');
                return {
                    value: response.value,
                    score: response.score
                }
            }
        }
    
        return {
            value: response,
            score: 1
        }
    }
    
}

export type Predicate <ROUTABLE> = Matcher<ROUTABLE, boolean>;

export class IfTrue <ROUTABLE> extends IfMatches<ROUTABLE, boolean> {
    constructor(
        predicate: Predicate<ROUTABLE>
    ) {
        super(routable => toObservable(predicate(routable))
            .map((response: any) => {
                if (response === true || response === false)
                    return response;

                if (typeof(response) === 'object') {
                    if (response.reason)
                        return response;
                    if (response.value !== undefined) {
                        if (response.value === false)
                            return false;
                        if (response.value === true)
                            return response;
                        throw new Error('When returning a Match from the predicate for IfTrue, the value must be true or false');
                    }
                }

                throw new Error('The predicate for ifTrue may only return true, false, a Match of true or false, or a NoMatch');
            })
        );
    }
}

export class BeforeRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor (beforeHandler: Handler<ROUTABLE>, router: Router<ROUTABLE>) {
        super(routable => router
            .getRoute$(routable)
            .map(route => route.type === 'action'
                ? {
                    ... route,
                    action: () => toObservable(beforeHandler(routable))
                        .flatMap(_ => toObservable(route.action()))
                }
                : route
            )
        );
    }
}

export class AfterRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor (afterHandler: Handler<ROUTABLE>, router: Router<ROUTABLE>) {
        super(routable => router
            .getRoute$(routable)
            .map(route => route.type === 'action'
                ? {
                    ... route,
                    action: () => toObservable(route.action())
                        .flatMap(_ => toObservable(afterHandler(routable)))
                }
                : route
            )
        );
    }
}

export class DefaultRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor (
        mainRouter: Router<ROUTABLE>,
        getDefaultRouter: (reason: string) => Router<ROUTABLE>
    ) {
        super(routable => mainRouter.getRoute$(routable)
            .flatMap(route => route.type === 'action'
                ? Observable.of(route)
                : getDefaultRouter(route.reason).getRoute$(routable)
            )
        );
    }
}
