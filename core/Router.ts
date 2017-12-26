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

export class Route {}

export class RouteWithScore extends Route {
    public score = 1;

    constructor (
        score?: number
    ) {
        super();

        if (score >= 0 && score <= 1)
            this.score = score;
    }

    static combinedScore(score, otherScore) {
        return score * otherScore
    }
}

export type Action = () => Observableable<any>;

export class DoRoute extends RouteWithScore {

    constructor (
        public action: Action,
        score?: number
    ) {
        super(score);
    }

    static is (route: Route): route is DoRoute {
        return route instanceof DoRoute;
    }
          
    // combinedWithScore(newScore: number) {
    //     const score = RouteWithScore.combinedScore(newScore, this.score);

    //     return this.score === score
    //         ? this
    //         : new DoRoute(this.action, score);
    // }
}

function _do(
    action: Action,
    score?: number
) {
    return () => new DoRoute(action, score);
}

export { _do as do }

export class NoRoute extends Route{

    static defaultReason = "none";
    
    constructor (
        public reason: string = NoRoute.defaultReason
    ) {
        super();
    }

    static is (route: Route): route is NoRoute {
        return route instanceof NoRoute;
    }
}

export function no (
    reason?: string
) {
    return () => new NoRoute(reason);
}

// export interface Match <VALUE> {
//     value: VALUE;
//     score?: number;
// }

// export interface NoMatch <VALUE> {
//     value?: VALUE;
//     reason: string;
// }

// export type MatchResult <VALUE> = Match<VALUE> | NoMatch<VALUE>;

// export type Matcher <VALUE> = () => Observableable<MatchResult<VALUE> | VALUE>;

// export type Predicate = Matcher<boolean>;

export function normalizedRoute (rawRoute: Route): Route {
    return rawRoute || new NoRoute();
}

export type GetRoute = () => Observableable<Route>;

// export function route$ (getRoute: GetRoute) {
//     return Observable.of(getRoute)
//         .flatMap(getNormalizedRoute$)
//         .do(route => konsole.log("route: returned a route", route))
//         .flatMap(route => DoRoute.is(route)
//             ? toObservable(route.action())
//                 .do(_ => konsole.log("route: called action"))
//                 .map(_ => true)
//             : Observable.of(false)
//         );
// }

const noRouteFirst = new NoRoute('first');

export function first (
    ... getRoutes: GetRoute[]
): GetRoute {
    return () => Observable.from(getRoutes)
        // we put concatMap first because it forces everything after it to execute serially
        .concatMap(getRoute => toObservable(getRoute()))
        .map(normalizedRoute)
        .filter(DoRoute.is)
        .take(1) // so that we don't keep going through routers after we find one that matches;
        .defaultIfEmpty(noRouteFirst);
}

const noRouteBest = new NoRoute('first');

const minRoute = new DoRoute(
    () => console.warn("BestRouter.minRoute.action should never be called"),
    0
);

export function best (
    ... getRoutes: GetRoute[]
): GetRoute {
    return () => new Observable<Route>(observer => {
        let bestRoute = minRoute;

        const subscription = Observable.from(getRoutes)
            // we put concatMap first because it forces everything after it to execute serially
            .concatMap(getRoute => toObservable(getRoute()))
            // early exit if we've already found a winner (score === 1)
            .takeWhile(_ => bestRoute.score < 1)
            .map(normalizedRoute)
            .filter(DoRoute.is)
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
                        : noRouteBest
                    );
                    observer.complete();
                }
            );

        return () => subscription.unsubscribe();
    });
}

const noRouteNoop = new NoRoute('noop');

export function noop (action: Action): GetRoute {
    return () => toObservable(action())
        .mapTo(noRouteNoop);
}

// export function isMatch <VALUE> (match: MatchResult<any>): match is Match<VALUE> {
//     return ((match as any).reason === undefined);
// }

// function normalizeMatchResult <VALUE> (response: any): MatchResult<VALUE> {
//     if (response == null || response === false)
//         return {
//             reason: defaultReason
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

// export function getNormalizedMatchResult$ <ROUTABLE, VALUE> (matcher: Matcher<ROUTABLE, VALUE>, routable: ROUTABLE) {
//     return toObservable(matcher(routable))
//         .map(response => normalizeMatchResult<VALUE>(response));
// }

// function getRouteIfMatches <ROUTABLE, VALUE> (
//     matcher: Matcher<ROUTABLE, VALUE>,
//     getThenGetRoute: (value: VALUE) => Observableable<GetRoute<ROUTABLE>>,
//     elseMapRoute: (route: NoRoute) => Observableable<GetRoute<ROUTABLE>> = route => routable => route
// ): GetRoute<ROUTABLE> {
//     return routable => getNormalizedMatchResult$(matcher, routable)
//         .flatMap(matchResult => isMatch(matchResult)
//             ? toObservable(getThenGetRoute(matchResult.value))
//                 .flatMap(getNormalizedRoute(routable))
//                 .map(route => isDoRoute(route)
//                     ? routeWithCombinedScore(route, matchResult.score)
//                     : route
//                 )
//             : toObservable(elseMapRoute(noRoute(matchResult.reason)))
//                 .flatMap(getNormalizedRoute(routable))
//         );
// }

// export { getRouteIfMatches as ifGet }

// export function predicateToMatcher <ROUTABLE> (predicate: Predicate<ROUTABLE>): Matcher<ROUTABLE, boolean> {
//     return routable => toObservable(predicate(routable))
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

// function getRouteIfTrue <ROUTABLE> (
//     predicate: Predicate<ROUTABLE>,
//     thenGetRoute: GetRoute<ROUTABLE>,
//     elseMapRoute: (route: NoRoute) => Observableable<GetRoute<ROUTABLE>>
// ): GetRoute<ROUTABLE> {
//     return getRouteIfMatches(predicateToMatcher(predicate), value => thenGetRoute, elseMapRoute);
// }

// export { getRouteIfTrue as if }

export type MapRoute = (route: Route) => Observableable<Route>;

export function map (
    getRoute: GetRoute,
    mapper: MapRoute
): GetRoute {
    return () => toObservable(getRoute())
        .map(normalizedRoute)
        .flatMap(route => toObservable(mapper(route)))
        .map(normalizedRoute);
}

export function before (
    action: Action,
    getRoute: GetRoute
) {
    return map(getRoute, route => DoRoute.is(route)
        ? new DoRoute(
            () => toObservable(action())
                .flatMap(_ => toObservable(route.action())),
            route.score
        )
        : route
    );
}

export function after (
    action: Action,
    getRoute: GetRoute
) {
    return map(getRoute, route => DoRoute.is(route)
        ? new DoRoute(
            () => toObservable(route.action())
                .flatMap(_ => toObservable(action())),
            route.score
        )
        : route
    );
}

function _default <ROUTABLE> (
    getRoute: GetRoute,
    mapRoute: MapRoute
) {
    return map(getRoute, route => NoRoute.is(route)
        ? mapRoute(route)
        : route
    );
}

export { _default as default }

// function _switch (
//     getKey: () => Observableable<string>,
//     mapKeyToGetRoute: Record<string, GetRoute>
// ) {
//     return getRouteIfMatches(getKey, key => mapKeyToGetRoute[key]);
// }

// export { _switch as switch }
