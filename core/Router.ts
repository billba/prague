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
        return this.defaultTry((_routable, reason) => Router.do(routable => handler(routable, reason)));
    }

    defaultTry (getRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>): Router<ROUTABLE>;
    defaultTry (router: Router<ROUTABLE>): Router<ROUTABLE>;
    defaultTry (arg) {
        return new DefaultRouter<ROUTABLE>(this, arg);
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

export interface Match <VALUE> {
    value: VALUE;
    score?: number;
}

export interface NoMatch <VALUE> {
    value?: VALUE;
    reason: string;
}

export type MatchResult <VALUE> = Match<VALUE> | NoMatch<VALUE>;

export type Matcher <ROUTABLE, VALUE> = (routable: ROUTABLE) => Observableable<MatchResult<VALUE> | VALUE>;

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

export class IfMatches <ROUTABLE, VALUE> extends Router<ROUTABLE> {
    constructor(
        protected matcher: Matcher<ROUTABLE, VALUE>,
        protected getThenRouter: (value: VALUE) => Router<ROUTABLE>,
        protected getElseRouter: (reason: string) => Router<ROUTABLE>
    ) {
        super(routable => toObservable(matcher(routable))
            .map(response => IfMatches.normalizeMatcherResponse<VALUE>(response))
            .flatMap(match => IfMatches.isMatch(match)
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

    static isMatch <VALUE> (match: MatchResult<any>): match is Match<VALUE> {
        return ((match as any).reason === undefined);
    }

    static defaultReason = "none";
    
    static normalizeMatcherResponse <VALUE> (response: any): MatchResult<VALUE> {
        if (response == null || response === false)
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
                    score: response.score || 1
                }
            }
        }
    
        return {
            value: response,
            score: 1
        }
    }
    
}

export class IfMatchesThen <ROUTABLE, VALUE> extends IfMatches<ROUTABLE, VALUE> {
    constructor(
        matcher: Matcher<ROUTABLE, VALUE>,
        getThenRouter: (value: VALUE) => Router<ROUTABLE>
    ) {
        super(matcher, getThenRouter, reason => Router.no(reason));
    }

    elseDo(elseHandler: (routable: ROUTABLE, reason: string) => Observableable<any>) {
        return this.elseTry(reason => Router.do(routable => elseHandler(routable, reason)));
    }

    elseTry(elseRouter: Router<ROUTABLE>): IfMatches<ROUTABLE, VALUE>;
    elseTry(getElseRouter: (reason: string) => Router<ROUTABLE>): IfMatches<ROUTABLE, VALUE>;
    elseTry(arg) {
        return new IfMatches(this.matcher, this.getThenRouter, typeof(arg) === 'function'
            ? arg
            : reason => arg
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
}

export type Predicate <ROUTABLE> = Matcher<ROUTABLE, boolean>;

export class IfTrue <ROUTABLE> extends IfMatches<ROUTABLE, boolean> {
    constructor(
        predicate: Predicate<ROUTABLE>,
        getThenRouter: (value: boolean) => Router<ROUTABLE>,
        getElseRouter: (reason: string) => Router<ROUTABLE>
    ) {
        super(predicateToMatcher(predicate), getThenRouter, getElseRouter);
    }
}

const predicateToMatcher = <ROUTABLE> (predicate: Predicate<ROUTABLE>): Matcher<ROUTABLE, boolean> => (routable: ROUTABLE) =>
    toObservable(predicate(routable))
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

export class IfTrueFluent <ROUTABLE> extends IfMatchesFluent<ROUTABLE, boolean> {
    constructor(
        predicate: Predicate<ROUTABLE>
    ) {
        super(predicateToMatcher(predicate));
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
        getDefaultRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>
    );
    constructor (
        mainRouter: Router<ROUTABLE>,
        defaultRouter: Router<ROUTABLE>
    );
    constructor (
        mainRouter: Router<ROUTABLE>,
        arg: Router<ROUTABLE> | ((routable: ROUTABLE, reason: string) => Router<ROUTABLE>)
    ) {
        const getDefaultRouter = typeof(arg) === 'function'
            ? arg
            : (routable: ROUTABLE, reason: string) => arg;
        super(routable => mainRouter.getRoute$(routable)
            .flatMap(route => route.type === 'action'
                ? Observable.of(route)
                : getDefaultRouter(routable, route.reason).getRoute$(routable)
            )
        );
    }
}

export class SwitchRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor (
        getKey: (routable: ROUTABLE) => Observableable<string>,
        mapKeyToRouter: Record<string, Router<ROUTABLE>>
    ) {
        super(routable => toObservable(getKey(routable))
            .map(key => mapKeyToRouter[key])
            .flatMap(router => router === undefined
                ? Observable.of(Router.noRoute())
                : router.getRoute$(routable)
            )
        );
    }
}
