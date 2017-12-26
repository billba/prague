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

export type Action = () => Observableable<any>;

export interface DoRoute {
    type: 'do';
    action: Action;
    score: number;
}

export function isDoRoute(route: Route): route is DoRoute {
    return route.type === 'do';
}

export function isNoRoute(route: Route): route is NoRoute {
    return route.type === 'no';
}

export interface NoRoute {
    type: 'no';
    reason: string;
}

export type Route = DoRoute | NoRoute;

export type RawRoute = Route | {
    type?: 'do';
    action: Action;
    score?: number;
 } | {
    type?: 'no';
    reason: string;
 }

export type GetRouteRaw <ROUTABLE> = (routable: ROUTABLE) => Observableable<Route | RawRoute | Action>;

export type GetRoute <ROUTABLE> = (routable: ROUTABLE) => Observableable<Route>;
export type GetRoute$ <ROUTABLE> = (routable: ROUTABLE) => Observable<Route>;

export type MapRoute <ROUTABLE> = (route: Route) => Observableable<GetRoute<ROUTABLE>>;

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

export function doRoute (
    action: () => Observableable<any>,
    score: number = 1
): DoRoute {
    return {
        type: 'do',
        action,
        score
    };
}

export const defaultReason = "none";

export function noRoute (
    reason: string = defaultReason
): NoRoute {
    return {
        type: 'no',
        reason
    };
}

export function normalizeRoute (rawRoute: RawRoute): Route {
    if (!rawRoute || (rawRoute as NoRoute).reason)
        return noRoute(rawRoute && (rawRoute as NoRoute).reason);
    if (typeof(rawRoute) === 'function')
        return doRoute(rawRoute);
    if ((rawRoute as DoRoute).action)
        return doRoute((rawRoute as DoRoute).action, (rawRoute as DoRoute).score);
    throw new Error('invalid route');
}

export const getNormalizedRoute = <ROUTABLE> (routable: ROUTABLE) => (getRoute: GetRouteRaw<ROUTABLE>) => getRoute
    ? toObservable(getRoute(routable))
        .map(normalizeRoute)
    : Observable.of(noRoute());

export function route$ <ROUTABLE> (routable: ROUTABLE, getRoute: GetRouteRaw<ROUTABLE>) {
    return Observable.of(getRoute)
        .flatMap(getNormalizedRoute(routable))
        .do(route => konsole.log("route: returned a route", route))
        .flatMap(route => isDoRoute(route)
            ? toObservable(route.action())
                .do(_ => konsole.log("route: called action"))
                .map(_ => true)
            : Observable.of(false)
        );
}

export function no <ROUTABLE> (
    reason?: string
): GetRoute$<ROUTABLE> {
    return routable => Observable.of(noRoute(reason));
}

export function getRouteDo <ROUTABLE> (
    handler: Handler<ROUTABLE>,
    score?: number
): GetRoute$<ROUTABLE> {
    return routable => Observable.of(doRoute(() => handler(routable), score));
}

export { getRouteDo as do }

export function first <ROUTABLE> (
    ... getRoutes: GetRouteRaw<ROUTABLE>[]
): GetRoute$<ROUTABLE> {
    return routable => Observable.from(getRoutes)
        .concatMap(getNormalizedRoute(routable))
        .filter(isDoRoute)
        .take(1) // so that we don't keep going through routers after we find one that matches;
        .defaultIfEmpty(noRoute('first'));
}

export function combinedScore(score, otherScore) {
    return score * otherScore
}

export function routeWithCombinedScore(route: DoRoute, newScore: number) {
    const score = combinedScore(newScore, route.score);

    return route.score === score
        ? route
        : {
            ... route,
            score
        } as Route;
}

export const minRoute = doRoute(
    () => {
        console.warn("BestRouter.minRoute.action should never be called");
    },
    0
);

export function best <ROUTABLE> (
    ... getRoutes: GetRouteRaw<ROUTABLE>[]
): GetRoute<ROUTABLE> {
    return routable => new Observable<Route>(observer => {
        let bestRoute = minRoute;

        const subscription = Observable.from(getRoutes)
            .takeWhile(_ => bestRoute.score < 1)
            .concatMap(getNormalizedRoute(routable))
            .filter(isDoRoute)
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
                        : noRoute('best')
                    );
                    observer.complete();
                }
            );

        return () => subscription.unsubscribe();
    });
}

export function noop <ROUTABLE> (handler: Handler<ROUTABLE>): GetRouteRaw<ROUTABLE> {
    return routable => toObservable(handler(routable))
        .map(_ => noRoute('noop'));
}

export function isMatch <VALUE> (match: MatchResult<any>): match is Match<VALUE> {
    return ((match as any).reason === undefined);
}

function normalizeMatchResult <VALUE> (response: any): MatchResult<VALUE> {
    if (response == null || response === false)
        return {
            reason: defaultReason
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

export function getNormalizedMatchResult$ <ROUTABLE, VALUE> (matcher: Matcher<ROUTABLE, VALUE>, routable: ROUTABLE) {
    return toObservable(matcher(routable))
        .map(response => normalizeMatchResult<VALUE>(response));
}

function getRouteIfMatches <ROUTABLE, VALUE> (
    matcher: Matcher<ROUTABLE, VALUE>,
    getThenGetRoute: (value: VALUE) => Observableable<GetRoute<ROUTABLE>>,
    elseMapRoute: (route: NoRoute) => Observableable<GetRoute<ROUTABLE>> = route => routable => route
): GetRoute<ROUTABLE> {
    return routable => getNormalizedMatchResult$(matcher, routable)
        .flatMap(matchResult => isMatch(matchResult)
            ? toObservable(getThenGetRoute(matchResult.value))
                .flatMap(getNormalizedRoute(routable))
                .map(route => isDoRoute(route)
                    ? routeWithCombinedScore(route, matchResult.score)
                    : route
                )
            : toObservable(elseMapRoute(noRoute(matchResult.reason)))
                .flatMap(getNormalizedRoute(routable))
        );
}

export { getRouteIfMatches as ifGet }

export function predicateToMatcher <ROUTABLE> (predicate: Predicate<ROUTABLE>): Matcher<ROUTABLE, boolean> {
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

function getRouteIfTrue <ROUTABLE> (
    predicate: Predicate<ROUTABLE>,
    thenGetRoute: GetRoute<ROUTABLE>,
    elseMapRoute: (route: NoRoute) => Observableable<GetRoute<ROUTABLE>>
): GetRoute<ROUTABLE> {
    return getRouteIfMatches(predicateToMatcher(predicate), value => thenGetRoute, elseMapRoute);
}

export { getRouteIfTrue as if }

export function map <ROUTABLE> (
    getRoute: GetRoute<ROUTABLE>,
    mapper: MapRoute<ROUTABLE>
): GetRoute$<ROUTABLE> {
    return routable => Observable.of(getRoute)
        .flatMap(getNormalizedRoute(routable))
        .flatMap(route => toObservable(mapper(route)))
        .flatMap(getNormalizedRoute(routable))
}

export function before <ROUTABLE> (
    beforeHandler: Handler<ROUTABLE>,
    getRoute: GetRoute<ROUTABLE>
): GetRoute$<ROUTABLE> {
    return map(getRoute, route => routable => isDoRoute(route)
        ? doRoute(
            () => toObservable(beforeHandler(routable))
                .flatMap(_ => toObservable(route.action())),
            route.score
        )
        : route
    );
}

export function after <ROUTABLE> (
    afterHandler: Handler<ROUTABLE>,
    getRoute: GetRoute<ROUTABLE>
): GetRoute$<ROUTABLE> {
    return map(getRoute, route => routable => isDoRoute(route)
        ? doRoute(
            () => toObservable(route.action())
                .flatMap(_ => toObservable(afterHandler(routable))),
            route.score
        )
        : route
    );
}

function getRouteDefault <ROUTABLE> (
    getRoute: GetRoute<ROUTABLE>,
    defaultMapRoute: (route: NoRoute) => Observableable<GetRoute<ROUTABLE>>
) {
    return map(getRoute, route => isNoRoute(route)
        ? defaultMapRoute(route)
        : routable => route
    );
}

export { getRouteDefault as default }

function getRouteSwitch <ROUTABLE> (
    getKey: (routable: ROUTABLE) => Observableable<string>,
    mapKeyToGetRoute: Record<string, GetRoute<ROUTABLE>>
) {
    return getRouteIfMatches(getKey, key => mapKeyToGetRoute[key]);
}

export { getRouteSwitch as switch }
