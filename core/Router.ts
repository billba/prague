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

export abstract class Route {
}

export type Action = () => Observableable<any>;

export class DoRoute extends Route {
    score: number;
    
    constructor (
        public action: Action,
        score?: number
    ) {
        super();

        this.score = score != null && score >= 0 && score < 1
            ? score
            : 1;
    }

    static is (route: Route): route is DoRoute {
        return route instanceof DoRoute;
    }

    clone(score = this.score): this {
        return score === this.score
            ? this
            : this.constructor(this.action, score);
    }
          
    static combinedScore(score, otherScore) {
        return score * otherScore
    }
}

function _do <VALUE = undefined> (
    action: (value?: VALUE) => Observableable<any>,
    score?: number
) {
    return (value: VALUE) => new DoRoute(() => action(value), score);
}

export { _do as do }

export class NoRoute extends Route{

    static defaultReason = "none";
    
    constructor (
        public reason: string = NoRoute.defaultReason
    ) {
        super();
    }

    static default = new NoRoute();

    static default$ = Observable.of(NoRoute.default);

    static is (route: Route): route is NoRoute {
        return route instanceof NoRoute;
    }
}

function _no (
    reason?: string
) {
    return () => new NoRoute(reason);
}

export { _no as no }

export type Router <VALUE = undefined> = (value: VALUE) => (Observableable<Route> | (() => Observableable<Route>));

export function getRoute$ <VALUE> (
    router: Router<VALUE>,
    value?: VALUE
): Observable<Route> {
    if (router == null)
        return NoRoute.default$;
    
    if (typeof router !== 'function')
        return Observable.throw(new Error('router must be a function'));
    
    return toObservable(router(value))
        .flatMap(result => typeof(result) === 'function'
            ? toObservable((result as Function)())
            : Observable.of(result)
        )
        .map(normalizedRoute)
        .catch(error => Observable.throw(error));
}

export function normalizedRoute (rawRoute: Route): Route {
    if (rawRoute == null)
        return NoRoute.default;
    if (rawRoute instanceof Route)
        return rawRoute;
    throw new Error('invalid route');
}

export function route$ <VALUE> (
    router: Router<VALUE>,
    value?: VALUE
) {
    return getRoute$(router, value)
        .filter(DoRoute.is)
        .flatMap(route => toObservable(route.action()))
        .mapTo(true)
        .defaultIfEmpty(false);
}

export function first (
    ... routers: Router[]
): Router {
    return () => Observable.from(routers)
        // we put concatMap here because it forces everything after it to execute serially
        .concatMap(router => getRoute$(router))
        .filter(DoRoute.is)
        .take(1) // so that we don't keep going through routers after we find one that matches
        .defaultIfEmpty(NoRoute.default);
}

const minRoute = new DoRoute(
    () => console.warn("minRoute.action should never be called"),
    0
);

export function best (
    ... routers: Router[]
): Router {
    return () => new Observable<Route>(observer => {
        let bestRoute = minRoute;

        const subscription = Observable.from(routers)
            .defaultIfEmpty(_no())
            // we put concatMap here because it forces everything after it to execute serially
            .concatMap(router => getRoute$(router))
            // early exit if we've already found a winner (score === 1)
            .takeWhile(_ => bestRoute.score < 1)
            .filter(DoRoute.is)
            .subscribe(
                route => {
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
                        : NoRoute.default
                    );
                    observer.complete();
                }
            );

        return () => subscription.unsubscribe();
    });
}

export function noop (
    action: Action
): Router {
    return () => toObservable(action())
        .mapTo(NoRoute.default);
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

export type Matcher <VALUE> = () => Observableable<MatchResult<VALUE> | VALUE>;

export function isMatch <VALUE> (matchResult: MatchResult<any>): matchResult is Match<VALUE> {
    return ((matchResult as any).reason === undefined);
}

function normalizeMatchResult <VALUE> (response: any): MatchResult<VALUE> {
    if (response == null || response === false)
        return {
            reason: NoRoute.defaultReason
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

export function getMatchResult$ <VALUE> (matcher: Matcher<VALUE>) {
    return toObservable(matcher())
        .map(response => normalizeMatchResult<VALUE>(response));
}

export function mapRouteIf <XRoute extends Route> (
    predicate: (route: Route) => route is XRoute,
    mapRoute: Router<XRoute>
) {
    return (route: Route) => predicate(route)
        ? getRoute$(mapRoute, route)
        : Observable.of(route);
}

const defaultElseMapRoute: Router<NoRoute> = (route: NoRoute) => route;

export function ifGet <VALUE> (
    matcher: Matcher<VALUE>,
    thenRouter: Router<Match<VALUE>>,
    elseMapRoute = defaultElseMapRoute
): Router {
    return () => getMatchResult$(matcher)
        .flatMap(matchResult => isMatch(matchResult)
            ? getRoute$(thenRouter, matchResult)
                .flatMap(mapRouteIf(DoRoute.is, route => 
                    route.clone(DoRoute.combinedScore(route.score, matchResult.score))
                ))
            : getRoute$(elseMapRoute, new NoRoute(matchResult.reason))
        );
}

export type Predicate = Matcher<boolean>;

export function predicateToMatcher (predicate: Predicate): Matcher<boolean> {
    return () => toObservable(predicate())
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

function _if (
    predicate: Predicate,
    thenRouter: Router<Match<boolean>>,
    elseMapRoute?: Router<NoRoute>
): Router {
    return ifGet(predicateToMatcher(predicate), thenRouter, elseMapRoute);
}

export { _if as if }

export function mapRouter <VALUE, XRoute extends Route = Route> (
    router: Router<VALUE>,
    mapRoute: Router<XRoute>
): Router<VALUE> {
    return (value: VALUE) => getRoute$(router, value)
        .flatMap(route => getRoute$(mapRoute, route));
}

function _default <ROUTABLE> (
    router: Router,
    mapRoute: Router<NoRoute>
) {
    return mapRouter(router, mapRouteIf(NoRoute.is, mapRoute));
}

export { _default as default }

export function before (
    router: Router,
    action: Action
) {
    return mapRouter(router, mapRouteIf(DoRoute.is, route => new DoRoute(
        () => toObservable(action())
            .flatMap(_ => toObservable(route.action())),
        route.score
    )));
}

export function after (
    router: Router,
    action: Action
) {
    return mapRouter(router, mapRouteIf(DoRoute.is, route => new DoRoute(
        () => toObservable(route.action())
            .flatMap(_ => toObservable(action())),
        route.score
    )));
}

function _switch (
    getKey: () => Observableable<string>,
    mapKeyToRouter: Record<string, Router>
) {
    return ifGet(getKey, match => mapKeyToRouter[match.value]);
}

export { _switch as switch }
