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

export abstract class ScoredRoute extends Route {
    score: number;
    
    constructor (
        score?: number
    ) {
        super();

        this.score = score != null && score >= 0 && score < 1
            ? score
            : 1;
    }

    abstract clone(score?: number);
    
    static combinedScore(score, otherScore) {
        return score * otherScore
    }
}

export type Action = () => Observableable<any>;

export class DoRoute extends ScoredRoute {
    constructor (
        public action: Action,
        score?: number
    ) {
        super(score);
    }

    static is (route: Route): route is DoRoute {
        return route instanceof DoRoute;
    }

    clone(score = this.score): this {
        return score === this.score
            ? this
            : this.constructor(this.action, score);
    }
}

function _do <VALUE = undefined> (
    action: (value?: VALUE) => Observableable<any>,
    score?: number
) {
    return (value: VALUE) => new DoRoute(() => action(value), score);
}

export { _do as do }

export class MatchRoute <VALUE = undefined> extends ScoredRoute {
    constructor(
        public value: VALUE,
        score?: number
    ) {
        super(score);
    }

    static is <VALUE = undefined> (route: Route): route is MatchRoute<VALUE> {
        return route instanceof MatchRoute;
    }

    clone(score = this.score): this {
        return score === this.score
            ? this
            : this.constructor(this.value, score);
    }
}

export class NoRoute <VALUE = undefined> extends Route {
    static defaultReason = "none";
    
    constructor (
        public reason = NoRoute.defaultReason,
        public value?: VALUE
    ) {
        super();
    }

    static default = new NoRoute();

    static default$ = Observable.of(NoRoute.default);

    static is <VALUE = undefined> (route: Route): route is NoRoute<VALUE> {
        return route instanceof NoRoute;
    }
}

function _no <VALUE> (
    reason?: string,
    value?: VALUE
) {
    return () => new NoRoute(reason, value);
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

// function normalizeMatchResult <VALUE> (response: any): MatchResult<VALUE> {
//     if (response == null || response === false)
//         return {
//             reason: NoRoute.defaultReason
//         }

//     if (typeof(response) === 'object') {
//         if (response.reason) {
//             if (typeof(response.reason) !== 'string')
//                 throw new Error('The reason for NoMatch must be a string');

//             return {
//                 reason: response.reason
//             }
//         }

//         if (response.value !== undefined) {
//             if (response.score !== undefined && typeof(response.score) !== 'number')
//                 throw new Error('The score for Match must be a number');

//             return {
//                 value: response.value,
//                 score: response.score || 1
//             }
//         }
//     }

//     return {
//         value: response,
//         score: 1
//     }
// }

// export function getMatchResult$ <VALUE> (matcher: Matcher<VALUE>) {
//     return toObservable(matcher())
//         .map(response => normalizeMatchResult<VALUE>(response));
// }

// We'd like to allow matchRouter to return:
// * a MatchRoute (via new)
// * a NoRoute (via new or returning undefined)
// * 

const defaultMapNoRoute = route => route;

export function ifGet <VALUE> (
    matchRouter: Router,
    thenMapMatchRoute: Router<MatchRoute<VALUE>>,
    elseMapNoRoute: Router<NoRoute<VALUE>> = defaultMapNoRoute
) {
    return mapRouter(matchRouter, route => {
        if (MatchRoute.is<VALUE>(route))
            return getRoute$(
                mapRouter(thenMapMatchRoute, mapRouteIf(DoRoute.is, _route => 
                    _route.clone(DoRoute.combinedScore(_route.score, route.score))
                )),
                route
            );
        if (NoRoute.is<VALUE>(route))
            return getRoute$(elseMapNoRoute, route);
        throw new Error('matchRouter should only return MatchRoute or NoRoute');
    });
}

// export type Predicate = MatchRouter<boolean>;

// export function predicateToRouter (predicate: Predicate) {
//     return () => toObservable(predicate())
//         .map((response: any) => {
//             if (response === true || response === false)
//                 return response;

//             if (typeof(response) === 'object') {
//                 if (response.reason)
//                     return response;

//                 if (response.value !== undefined) {
//                     if (response.value === false)
//                         return false;
//                     if (response.value === true)
//                         return response;
//                     throw new Error('When returning a Match from a predicate, the value must be true or false');
//                 }
//             }

//             throw new Error('A predicate may only return true, false, a Match of true or false, or a NoMatch');
//         });
// }

function _if (
    predicate: Router,
    thenMapMatchRoute: Router<MatchRoute<boolean>>,
    elseMapNoRoute?: Router<NoRoute<boolean>>
) {
    return ifGet(predicate, thenMapMatchRoute, elseMapNoRoute);
}

export { _if as if }

export function mapRouter <VALUE, ROUTE extends Route = Route> (
    router: Router<VALUE>,
    mapRoute: Router<ROUTE>
): Router<VALUE> {
    return (value: VALUE) => getRoute$(router, value)
        .flatMap(route => getRoute$(mapRoute, route));
}

export function mapRouteIf <ROUTE extends Route> (
    predicate: (route: Route) => route is ROUTE,
    mapRoute: Router<ROUTE>
) {
    return (route: Route) => predicate(route)
        ? getRoute$(mapRoute, route)
        : Observable.of(route);
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
    return ifGet<string>(
        () => toObservable(getKey())
            .map(key => new MatchRoute(key)),
        match => mapKeyToRouter[match.value]
    );
}

export { _switch as switch }
