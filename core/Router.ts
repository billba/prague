import { konsole } from './Konsole';
import { Observable } from 'rxjs';

export type Observableable <T> = T | Observable<T> | Promise<T>;

export function toObservable <T> (t: Observableable<T>) {
    if (t instanceof Observable)
        return t.take(1);
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t);
    return Observable.of(t);
}

export interface DoRoute {
    type: 'do';
    action: () => Observableable<any>;
    score: number;
}

export interface NoRoute {
    type: 'no';
    reason: string;
}

export type Route = DoRoute | NoRoute;

export type GetRoute$ <ROUTABLE> = (routable: ROUTABLE) => Observable<Route>

export type Handler <ROUTABLE> = (routable: ROUTABLE) => Observableable<any>;

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

export type Predicate <ROUTABLE> = Matcher<ROUTABLE, boolean>;

export class Router <ROUTABLE> {
    constructor(public _getRoute$: GetRoute$<ROUTABLE>) {}

    static doRoute (
        action: () => Observableable<any>,
        score: number = 1
    ) {
        return {
            type: 'do',
            action,
            score
        } as DoRoute;
    }

    static noRoute (reason: string = Router.defaultReason) {
        return {
            type: 'no',
            reason
        } as NoRoute;
    }

    static combineScore(score, otherScore) {
        return score * otherScore
    }

    static routeWithCombinedScore(route: DoRoute, newScore: number) {
        const score = Router.combineScore(newScore, route.score);

        return route.score === score
            ? route
            : {
                ... route,
                score
            } as Route;
    }

    static route$ <ROUTABLE> (routable: ROUTABLE, router: Router<ROUTABLE>) {
        return router
            ._getRoute$(routable)
            .do(route => konsole.log("route: returned a route", route))
            .flatMap(route => route.type === 'do'
                ? toObservable(route.action())
                    .do(_ => konsole.log("route: called action"))
                    .map(_ => true)
                : Observable.of(false)
            );
    }

    static minRoute = Router.doRoute(
        () => {
            console.warn("BestRouter.minRoute.action should never be called");
        },
        0
    );

    static defaultReason = "none";

    static getRouteNo$ <ROUTABLE> (
        reason?: string
    ): GetRoute$<ROUTABLE> {
        return routable => Observable.of(Router.noRoute(reason));
    }

    static getRouteDo$ <ROUTABLE> (
        handler: Handler<ROUTABLE>,
        score?: number
    ): GetRoute$<ROUTABLE> {
        return routable => Observable.of(Router.doRoute(() => handler(routable), score));
    }

    static getRouteFirst$ <ROUTABLE> (
        ... getRouters: ((routable: ROUTABLE) => Observableable<Router<ROUTABLE>>)[]
    ): GetRoute$<ROUTABLE> {
        return routable => Observable.from(getRouters)
            .filter(getRouter => !!getRouter)
            .flatMap(getRouter => toObservable(getRouter(routable)))
            .map(Router.toRouter)
            .concatMap((router, i) => {
                konsole.log(`first: trying router #${i}`);
                return router
                    ._getRoute$(routable)
                    .do(route => konsole.log(`first: router #${i} returned route`, route));
            })
            .filter(route => route.type === 'do')
            .take(1) // so that we don't keep going through routers after we find one that matches;
            .defaultIfEmpty(Router.noRoute('tryInOrder'));
    }

    static getRouteBest$ <ROUTABLE> (
        ... getRouters: ((routable: ROUTABLE) => Observableable<Router<ROUTABLE>>)[]
    ): GetRoute$<ROUTABLE> {
        return routable => new Observable<Route>(observer => {
            let bestRoute = Router.minRoute;

            const subscription = Observable.from(getRouters)
                .filter(getRouter => !!getRouter)
                .flatMap(getRouter => toObservable(getRouter(routable)))
                .map(Router.toRouter)
                .takeWhile(_ => bestRoute.score < 1)
                .concatMap(router => router._getRoute$(routable))
                .filter(route => route.type === 'do')
                .subscribe(
                    (route: DoRoute) => {
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
                        observer.next(bestRoute.score > 0
                            ? bestRoute
                            : Router.noRoute('tryInScoreOrder')
                        );
                        observer.complete();
                    }
                );

            return () => subscription.unsubscribe();
        });
    }

    static getRouteNoop$ <ROUTABLE> (handler: Handler<ROUTABLE>): GetRoute$<ROUTABLE> {
        return routable => toObservable(handler(routable))
            .map(_ => Router.noRoute('noop'));
    }

    static isMatch <VALUE> (match: MatchResult<any>): match is Match<VALUE> {
        return ((match as any).reason === undefined);
    }

    static normalizeMatchResult <VALUE> (response: any): MatchResult<VALUE> {
        if (response == null || response === false)
            return {
                reason: Router.defaultReason
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

    static toRouter <ROUTABLE> (router: Router<ROUTABLE>): Router<ROUTABLE> {
        return router || new Router(Router.getRouteNo$());
    }

    static getRouteIfMatches$ <ROUTABLE, VALUE> (
        matcher: Matcher<ROUTABLE, VALUE>,
        getThenRouter: (routable: ROUTABLE, value: VALUE) => Observableable<Router<ROUTABLE>>,
        getElseRouter?: (routable: ROUTABLE, reason: string) => Observableable<Router<ROUTABLE>>
    ): GetRoute$<ROUTABLE> {
        if (!getElseRouter)
            getElseRouter = (routable: ROUTABLE, reason: string) => new Router<ROUTABLE>(Router.getRouteNo$(reason));
        return routable => toObservable(matcher(routable))
            .map(response => Router.normalizeMatchResult<VALUE>(response))
            .flatMap(matchResult => Router.isMatch(matchResult)
                ? toObservable(getThenRouter(routable, matchResult.value))
                    .map(Router.toRouter)
                    .flatMap(router => router._getRoute$(routable))
                    .map(route => route.type === 'do'
                        ? Router.routeWithCombinedScore(route, matchResult.score)
                        : route
                    )
                : toObservable(getElseRouter(routable, matchResult.reason))
                    .map(Router.toRouter)
                    .flatMap(router => router._getRoute$(routable))
        );
    }

    static predicateToMatcher <ROUTABLE> (predicate: Predicate<ROUTABLE>): Matcher<ROUTABLE, boolean> {
        return routable => toObservable(predicate(routable))
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
                        throw new Error('When returning a Match from a predicate, the value must be true or false');
                    }
                }

                throw new Error('A predicate may only return true, false, a Match of true or false, or a NoMatch');
            });
    }

    static getRouteIfTrue$ <ROUTABLE> (
        predicate: Predicate<ROUTABLE>,
        getThenRouter: (routable: ROUTABLE, value: boolean) => Observableable<Router<ROUTABLE>>,
        getElseRouter?: (routable: ROUTABLE, reason: string) => Observableable<Router<ROUTABLE>>
    ): GetRoute$<ROUTABLE> {
        return Router.getRouteIfMatches$(Router.predicateToMatcher(predicate), getThenRouter, getElseRouter);
    }

    static getRouteBefore$ <ROUTABLE> (
        beforeHandler: Handler<ROUTABLE>,
        router: Router<ROUTABLE>
    ): GetRoute$<ROUTABLE> {
        return routable => router
            ._getRoute$(routable)
            .map(route => route.type === 'do'
                ? {
                    ... route,
                    action: () => toObservable(beforeHandler(routable))
                        .flatMap(_ => toObservable(route.action()))
                }
                : route
            );
    }

    static getRouteAfter$ <ROUTABLE> (
        afterHandler: Handler<ROUTABLE>,
        router: Router<ROUTABLE>
    ): GetRoute$<ROUTABLE> {
        return routable => router
            ._getRoute$(routable)
            .map(route => route.type === 'do'
                ? {
                    ... route,
                    action: () => toObservable(route.action())
                        .flatMap(_ => toObservable(afterHandler(routable)))
                }
                : route
            );
    }

    static getRouteDefault$ <ROUTABLE> (
        mainRouter: Router<ROUTABLE>,
        getDefaultRouter: (routable: ROUTABLE, reason: string) => Observableable<Router<ROUTABLE>>
    ): GetRoute$<ROUTABLE> {
        return routable => mainRouter._getRoute$(routable)
            .flatMap(route => route.type === 'do'
                ? Observable.of(route)
                : toObservable(getDefaultRouter(routable, route.reason))
                    .map(Router.toRouter)
                    .flatMap(router => router._getRoute$(routable))
            );
    }

    static getRouteSwitch$ <ROUTABLE> (
        getKey: (routable: ROUTABLE) => Observableable<string>,
        getMapKeyToRouter: (routable: ROUTABLE) => Observableable<Record<string, Router<ROUTABLE>>>
    ): GetRoute$<ROUTABLE> {
        return routable => toObservable(getKey(routable))
            .flatMap(key => toObservable(getMapKeyToRouter(routable))
                .map(mapKeyToRouter => mapKeyToRouter[key])
            )
            .map(Router.toRouter)
            .flatMap(router => router._getRoute$(routable));
    }
}
