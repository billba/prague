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

export function toFilteredObservable <T> (t: Observableable<T>) {
    if (!t)
        return Observable.empty<T>();
    if (t instanceof Observable)
        return t.filter(i => !!i);
    if (t instanceof Promise)
        return Observable.fromPromise<T> (t).filter(i => !!i);
    return Observable.of(t);
}

export interface Route {
    score?: number;
    thrown?: true;
    action: () => Observableable<any>;
}

export interface Match {
    score?: number;
}

export interface Handler <Z extends Match = {}> {
    (m: Z): Observableable<any>;
}

export type RouterOrHandler <M extends Match = {}> = Router<M> | Handler<M>;

export class Router <M extends Match> {
    constructor(public getRoute: (m: M) => Observable<Route>) {}

    static fromHandler <M extends Match> (handler: Handler<M>) {
        return new Router<M>(m => Observable.of({
            action: () => handler(m)
        } as Route));
    }
    
    static from <M extends Match> (routerOrHandler: RouterOrHandler<M>) {
        return routerOrHandler instanceof Router ? routerOrHandler : Router.fromHandler(routerOrHandler);
    }

    static null = new Router<any>(m => Observable.empty());

    route (m: M) {
        return this.getRoute(m)
            .do(route => konsole.log("handle: matched a route", route))
            .flatMap(route => toObservable(route.action()))
            .do(_ => konsole.log("handle: called action"));
    }
}

function filteredRouter$ <M extends Match> (... routersOrHandlers: RouterOrHandler<M>[]) {
    return Observable.from(routersOrHandlers)
        .filter(routerOrHandler => !!routerOrHandler)
        .map(routerOrHandler => Router.from(routerOrHandler));
}

export function first <M extends Match> (... routersOrHandlers: RouterOrHandler<M>[]) {
    const router$ = filteredRouter$(... routersOrHandlers);
    return new Router<M>(m => router$
        .concatMap(
            (router, i) => {
                konsole.log(`first: trying router #${i}`);
                return router.getRoute(m)
                    .do(n => konsole.log(`first: router #${i} succeeded`, n));
            }
        )
        .take(1) // so that we don't keep going through routers after we find one that matches
    );
}

const minRoute: Route = {
    score: 0,
    action: () => console.warn("This should never be called")
}

export function toScore (score: number) {
    return score == null ? 1 : score;
}

export function addScore<T extends { score?: number }>(t: T, score: number): T {
    return toScore(t.score) === score
        ? t
        : {
            ... t as any,
            score
        } as T;
}

export function best <M extends Match> (... routersOrHandlers: RouterOrHandler<M>[]) {
    const router$ = filteredRouter$(... routersOrHandlers);
    return new Router<M>(m => new Observable<Route>(observer => {
        let bestRoute: Route = minRoute;

        const subscription = router$
            .takeWhile(_ => toScore(bestRoute.score) < 1)
            .concatMap(router => router.getRoute(m))
            .subscribe(
                route => {
                    if (toScore(route.score) > toScore(bestRoute.score)) {
                        bestRoute = route;
                        if (toScore(bestRoute.score) === 1) {
                            observer.next(bestRoute);
                            observer.complete();
                        }
                    }
                },
                error =>
                    observer.error(error),
                () => {
                    if (toScore(bestRoute.score) > 0)
                        observer.next(bestRoute);
                    observer.complete();
                }
            );

        return () => subscription.unsubscribe();
    }));
}

export function run <M extends Match> (handler: Handler<M>) {
    return new Router<M>(m => toObservable(handler(m))
        .filter(_ => false)
    );
}

export interface Matcher <M extends Match = {}, Z extends Match = {}> {
    (m: M): Observableable<Z>;
}

export interface Predicate <M extends Match = {}> {
    (m: M): Observableable<boolean>;
}

export function tryMatch <M extends Match, N extends Match> (matcher: Matcher<M, N>, m: M): Observable<N>;
export function tryMatch <M extends Match> (predicate: Predicate<M>, m: M): Observable<M>;
export function tryMatch <M extends Match> (predicateOrMatcher: Predicate | Matcher, m: M): Observable<any>;
export function tryMatch(predicateOrMatcher: Matcher | Predicate, m): Observable<any> {
    // we want to allow any matcher to be a predicate (return a boolean)
    // if so, the 'falsey' case will be filtered out by toFilteredObservable,
    // so we just need to catch the case where it is precisely true
    konsole.log("tryMatch", predicateOrMatcher, m);
    return toFilteredObservable(predicateOrMatcher(m))
        .map(n => typeof n === 'boolean'
            ? addScore(m, 1)
            : n
        );
}

export function combineScores(previousScore, nextScore) {
    return toScore(previousScore) * toScore(nextScore);
}

export function routeWithCombinedScore(route: Route, score?: number) {
    return addScore(route, combineScores(score, route.score));
}

export function ifMatch <M extends Match> (
    predicate: Predicate<M>,
    ifRouterOrHandler: RouterOrHandler<M>,
    elseRouterOrHandler?: RouterOrHandler<M>,
): Router<M>;

export function ifMatch <M extends Match, N extends Match> (
    matcher: Matcher<M, N>,
    ifRouterOrHandler: RouterOrHandler<N>,
    elseRouterOrHandler?: RouterOrHandler<M>,
): Router<M>;

export function ifMatch <M extends Match> (
    predicateOrMatcher: Predicate<M> | Matcher<M>,
    ifRouterOrHandler: RouterOrHandler,
    elseRouterOrHandler?: RouterOrHandler,
) {
    const ifRouter = Router.from(ifRouterOrHandler);
    const elseRouter = elseRouterOrHandler
        ? Router.from(elseRouterOrHandler)
        : Router.null;
    return new Router<M>(m => tryMatch(predicateOrMatcher, m)
        .defaultIfEmpty(null)
        .flatMap((n: Match) => n
            ? ifRouter.getRoute(n)
                .map(route => routeWithCombinedScore(route, n.score))    
            : elseRouter.getRoute(m)
                .map(route => routeWithCombinedScore(route, m.score))    
        )
    );
}

const thrownRoute: Route = {
    thrown: true,
    action: () => {}
};

export function throwRoute <M extends Match> () {
    return new Router<M>(m => Observable.of(thrownRoute));
}

export function catchRoute <M extends Match> (routerOrHandler: RouterOrHandler<M>): Router<M> {
    return new Router<M>(m => Router.from(routerOrHandler)
        .getRoute(m)
        .filter(route => !route.thrown)
    );
}

export function before <M extends Match> (beforeHandler: Handler<M>, routerOrHandler: RouterOrHandler<M>) {
    const router = Router.from(routerOrHandler);
    return new Router<M>(m => router.getRoute(m)
        .map(route => ({
            ... route,
            action: () => toObservable(beforeHandler(m))
                .flatMap(_ => toObservable(route.action()))
        }))
    );
}

export function after <M extends Match> (routerOrHandler: RouterOrHandler<M>, afterHandler: Handler<M>) {
    const router = Router.from(routerOrHandler);
    return new Router<M>(m => router.getRoute(m)
        .map(route => ({
            ... route,
            action: () => toObservable(route.action())
                .flatMap(_ => toObservable(afterHandler(m)))
        }))
    );
}
