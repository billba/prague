import { konsole } from './Konsole';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operator/map';

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

export type GetRoute$ <ROUTABLE> =  (routable: ROUTABLE) => Observable<Route>

export class Router <ROUTABLE> {
    constructor(public getRoute$: GetRoute$<ROUTABLE>) {}

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


    static combineScore(score, otherScore) {
        return score * otherScore
    }

    static routeWithCombinedScore(route: ActionRoute, newScore: number) {
        const score = Router.combineScore(newScore, route.score);

        return route.score === score
            ? route
            : {
                ... route,
                score
            } as Route;
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
        return new DefaultRouter<ROUTABLE>(this, typeof(arg) === 'function'
            ? arg
            : (routable: ROUTABLE, reason: string) => arg
        );
    }
}

export const getRouteFirst$ = <ROUTABLE> (... routers: Router<ROUTABLE>[]): GetRoute$<ROUTABLE> => routable =>
    Observable.from(routers)
        .filter(router => !!router)
        .concatMap((router, i) => {
            konsole.log(`first: trying router #${i}`);
            return router
                .getRoute$(routable)
                .do(route => konsole.log(`first: router #${i} returned route`, route));
        })
        .filter(route => route.type === 'action')
        .take(1) // so that we don't keep going through routers after we find one that matches;
        .defaultIfEmpty(Router.noRoute('tryInOrder'));

export class FirstRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor (... routers: Router<ROUTABLE>[]) {
        super(getRouteFirst$(... routers));
    }
}

export const minRoute = Router.actionRoute(
    () => {
        console.warn("BestRouter.minRoute.action should never be called");
    },
    0
);

export const getRouteBest$ = <ROUTABLE> (... routers: Router<ROUTABLE>[]): GetRoute$<ROUTABLE> => routable =>
    new Observable<Route>(observer => {
        let bestRoute = minRoute;

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
    });

export class BestRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor(... routers: Router<ROUTABLE>[]) {
        super(getRouteBest$(... routers));
    }
}

export const getRouteNoop$ = <ROUTABLE> (handler: Handler<ROUTABLE>): GetRoute$<ROUTABLE> => routable =>
    toObservable(handler(routable))
        .map(_ => Router.noRoute('noop'));

export class RunRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor(handler: Handler<ROUTABLE>) {
        super(getRouteNoop$(handler));
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

export const getRouteIfMatches$ = <ROUTABLE, VALUE> (
    matcher: Matcher<ROUTABLE, VALUE>,
    getThenRouter: (routable: ROUTABLE, value: VALUE) => Router<ROUTABLE>,
    getElseRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>
): GetRoute$<ROUTABLE> => routable =>
    toObservable(matcher(routable))
        .map(response => IfMatches.normalizeMatcherResponse<VALUE>(response))
        .flatMap(match => IfMatches.isMatch(match)
            ? getThenRouter(routable, match.value)
                .getRoute$(routable)
                .map(route => route.type === 'action'
                    ? Router.routeWithCombinedScore(route, match.score)
                    : route
                )
            : getElseRouter(routable, match.reason)
                .getRoute$(routable)
        );

export class IfMatches <ROUTABLE, VALUE> extends Router<ROUTABLE> {
    constructor(
        protected matcher: Matcher<ROUTABLE, VALUE>,
        protected getThenRouter: (routable: ROUTABLE, value: VALUE) => Router<ROUTABLE>,
        protected getElseRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>
    ) {
        super(getRouteIfMatches$(matcher, getThenRouter, getElseRouter));
    }

    static isMatch <VALUE> (match: MatchResult<any>): match is Match<VALUE> {
        return ((match as any).reason === undefined);
    }

    private static defaultReason = "none";
    
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

export type Predicate <ROUTABLE> = Matcher<ROUTABLE, boolean>;

export const predicateToMatcher = <ROUTABLE> (predicate: Predicate<ROUTABLE>): Matcher<ROUTABLE, boolean> =>
    routable => toObservable(predicate(routable))
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
        });

export const getRouteIfTrue$ = <ROUTABLE> (
    predicate: Predicate<ROUTABLE>,
    getThenRouter: (routable: ROUTABLE, value: boolean) => Router<ROUTABLE>,
    getElseRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>
): GetRoute$<ROUTABLE> => routable =>
    getRouteIfMatches$(predicateToMatcher(predicate), getThenRouter, getElseRouter)(routable);

export class IfTrue <ROUTABLE> extends IfMatches<ROUTABLE, boolean> {
    constructor(
        predicate: Predicate<ROUTABLE>,
        getThenRouter: (routable: ROUTABLE, value: boolean) => Router<ROUTABLE>,
        getElseRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>
    ) {
        super(predicateToMatcher(predicate), getThenRouter, getElseRouter);
    }
}

export const getRouteBefore$ = <ROUTABLE> (
    beforeHandler: Handler<ROUTABLE>,
    router: Router<ROUTABLE>
): GetRoute$<ROUTABLE> => routable =>
    router
        .getRoute$(routable)
        .map(route => route.type === 'action'
            ? {
                ... route,
                action: () => toObservable(beforeHandler(routable))
                    .flatMap(_ => toObservable(route.action()))
            }
            : route
        );

export class BeforeRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor (beforeHandler: Handler<ROUTABLE>, router: Router<ROUTABLE>) {
        super(getRouteBefore$(beforeHandler, router));
    }
}

export const getRouteAfter$ = <ROUTABLE> (afterHandler: Handler<ROUTABLE>, router: Router<ROUTABLE>): GetRoute$<ROUTABLE> => routable =>
    router
        .getRoute$(routable)
        .map(route => route.type === 'action'
            ? {
                ... route,
                action: () => toObservable(route.action())
                    .flatMap(_ => toObservable(afterHandler(routable)))
            }
            : route
        );

export class AfterRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor (afterHandler: Handler<ROUTABLE>, router: Router<ROUTABLE>) {
        super(getRouteAfter$(afterHandler, router));
    }
}

export const getRouteDefault$ = <ROUTABLE> (
    mainRouter: Router<ROUTABLE>,
    getDefaultRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>
): GetRoute$<ROUTABLE> => routable =>
    mainRouter.getRoute$(routable)
        .flatMap(route => route.type === 'action'
            ? Observable.of(route)
            : getDefaultRouter(routable, route.reason).getRoute$(routable)
        );

export class DefaultRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor (
        mainRouter: Router<ROUTABLE>,
        getDefaultRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>
    ) {
        super(getRouteDefault$(mainRouter, getDefaultRouter));
    }
}

export const getRouteSwitch$ = <ROUTABLE> (
    getKey: (routable: ROUTABLE) => Observableable<string>,
    mapKeyToRouter: Record<string, Router<ROUTABLE>>
): GetRoute$<ROUTABLE> => routable =>
    toObservable(getKey(routable))
        .map(key => mapKeyToRouter[key])
        .flatMap(router => router === undefined
            ? Observable.of(Router.noRoute())
            : router.getRoute$(routable)
        );

export class SwitchRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor (
        getKey: (routable: ROUTABLE) => Observableable<string>,
        mapKeyToRouter: Record<string, Router<ROUTABLE>>
    ) {
        super(getRouteSwitch$(getKey, mapKeyToRouter));
    }
}
