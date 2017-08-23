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

export interface Router <M extends object> {
    getRoute(message: M): Observable<Route>;
}

export function nullRouter <M extends object = {}> (): Router<M> {
    return {
        getRoute: (m) => Observable.empty()
    }
}

export function routeMessage <M extends object> (router: Router<M>, message: M) {
    return router.getRoute(message)
        .do(route => konsole.log("handle: matched a route", route))
        .flatMap(route => toObservable(route.action()))
        .do(_ => konsole.log("handle: called action"));
}

export interface Handler <Z extends object = {}> {
    (message: Z): Observableable<any>;
}

export type RouterOrHandler <M extends object = {}> = Router<M> | Handler<M>;

export function isRouter <M extends object> (routerOrHandler: RouterOrHandler<M>): routerOrHandler is Router<M> {
    return ((routerOrHandler as any).getRoute !== undefined);
}

export function simpleRouter <M extends object> (handler: Handler<M>): Router<M> {
    return {
        getRoute: (m) => Observable.of({
            action: () => handler(m)
        } as Route)
    }
}

export function toRouter <M extends object> (routerOrHandler: RouterOrHandler<M>): Router<M> {
    return isRouter(routerOrHandler) ? routerOrHandler : simpleRouter(routerOrHandler);
}

function filteredRouter$ <M extends object> (... routersOrHandlers: RouterOrHandler<M>[]) {
    return Observable.from(routersOrHandlers)
        .filter(routerOrHandler => !!routerOrHandler)
        .map(routerOrHandler => toRouter(routerOrHandler));
}

export function first <M extends object> (... routersOrHandlers: RouterOrHandler<M>[]): Router<M> {
    const routers = filteredRouter$(... routersOrHandlers);
    return {
        getRoute: (m) =>
            routers.flatMap(
                (router, i) => {
                    konsole.log(`first: trying router #${i}`);
                    return router.getRoute(m)
                        .do(m => konsole.log(`first: router #${i} succeeded`, m));
                },
                1
            )
            .take(1) // so that we don't keep going through routers after we find one that matches
    }
}

const minRoute: Route = {
    score: 0,
    action: () => console.warn("This should never be called")
}

function toScore (score: number) {
    return score == null ? 1 : score;
}

export function best <M extends object> (... routersOrHandlers: RouterOrHandler<M>[]): Router<M> {
    const routers = filteredRouter$(... routersOrHandlers);
    return {
        getRoute: (m) =>
            filteredRouter$(... routersOrHandlers).flatMap(
                (router, i) => {
                    konsole.log(`best: trying router #${i}`);
                    return router.getRoute(m)
                        .do(m => konsole.log(`best: router #${i} succeeded`, m));
                }
            )
            .reduce(
                (prev, current) => toScore(prev.score) >= toScore(current.score) ? prev : current,
                minRoute
            )
            .filter(route => toScore(route.score) > 0)
    }
}

export function run <M extends object> (handler: Handler<M>): Router<M> {
    return {
        getRoute: (m) =>
            toObservable(handler(m))
                .filter(_ => false)
    }
}

export interface Matcher <M extends object = {}, Z extends object = {}> {
    (message: M): Observableable<Z>;
}

export interface Predicate <M extends object = {}> {
    (message: M): Observableable<boolean>;
}

export function tryMatch <M extends object, N extends object> (matcher: Matcher<M, N>, message: M): Observable<N>;
export function tryMatch <M extends object> (predicate: Predicate<M>, message: M): Observable<M>;
export function tryMatch <M extends object> (predicateOrMatcher: Predicate | Matcher, message: M): Observable<any>;
export function tryMatch(predicateOrMatcher: Matcher | Predicate, message): Observable<any> {
    // we want to allow any matcher to be a predicate (return a boolean)
    // if so, the 'falsey' case will be filtered out by toFilteredObservable,
    // so we just need to catch the case where it is precisely true
    konsole.log("tryMatch", predicateOrMatcher, message);
    return toFilteredObservable(predicateOrMatcher(message))
        .map(m => typeof m === 'boolean' ? message : m);
}

export function ifMatch <L extends object, M extends object> (
    matcher: Matcher<L, M>,
    routerOrHandler: RouterOrHandler<M>
): Router<L>;

export function ifMatch <M extends object> (
    predicate: Predicate<M>,
    routerOrHandler: RouterOrHandler<M>
): Router<M>;

export function ifMatch (
    predicateOrMatcher: Matcher | Predicate,
    routerOrHandler: RouterOrHandler
): Router<any> {
    const router = toRouter(routerOrHandler);
    return {
        getRoute: (m) =>
            tryMatch(predicateOrMatcher, m)
                .flatMap(m => router.getRoute(m))
    };
}

export function ifMatchElse <M extends object> (
    predicate: Predicate<M>,
    ifRouterOrHandler: RouterOrHandler<M>,
    elseRouterOrHandler: RouterOrHandler<M>,
): Router<M>;

export function ifMatchElse <M extends object, N extends object> (
    matcher: Matcher<M, N>,
    ifRouterOrHandler: RouterOrHandler<N>,
    elseRouterOrHandler: RouterOrHandler<M>,
): Router<M>;

export function ifMatchElse <M extends object> (
    predicateOrMatcher: Predicate<M> | Matcher<M>,
    ifRouterOrHandler: RouterOrHandler,
    elseRouterOrHandler: RouterOrHandler,
): Router<M> {
    const ifRouter = toRouter(ifRouterOrHandler);
    const elseRouter = toRouter(elseRouterOrHandler);
    return {
        getRoute: (m) =>
            tryMatch(predicateOrMatcher, m)
                .defaultIfEmpty(null)
                .flatMap(n => n
                    ? ifRouter.getRoute(n)
                    : elseRouter.getRoute(m)
                )
    };
}

const thrownRoute: Route = {
    thrown: true,
    action: () => {}
};

export function throwRoute <M extends object> (): Router<M> {
    return {
        getRoute: (m) => Observable.of(thrownRoute)
    }
}

export function catchRoute <M extends object> (routerOrHandler: RouterOrHandler<M>): Router<M> {
    return {
        getRoute: (m) => toRouter(routerOrHandler).getRoute(m)
            .filter(route => !route.thrown)
    }
}
