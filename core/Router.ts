import { konsole } from './Konsole';
import { Observable } from 'rxjs';

export type Observableable <T> = T | Observable<T> | Promise<T>;

export const toObservable = <T> (t: Observableable<T>) => {
    if (t instanceof Observable)
        return t;
    if (t instanceof Promise)
        return Observable.fromPromise<T> (t);
    return Observable.of(t);
}

export const toFilteredObservable = <T> (t: Observableable<T>) => {
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

export interface Handler <Z extends object = {}> {
    (message: Z): Observableable<any>;
}

export type RouterOrHandler <M extends object = {}> = Router<M> | Handler<M>;

export function isRouter <M extends object> (routerOrHandler: RouterOrHandler<M>): routerOrHandler is Router<M> {
    return ((routerOrHandler as any).getRoute !== undefined);
}

export const toRouter = <M extends object> (routerOrHandler: RouterOrHandler<M>) => {
    return isRouter(routerOrHandler) ? routerOrHandler : simpleRouter(routerOrHandler);
}

export const routeMessage = <M extends object> (router: Router<M>, message: M) => 
    router.getRoute(message)
        .do(route => konsole.log("handle: matched a route", route))
        .flatMap(route => toObservable(route.action()))
        .do(_ => konsole.log("handle: called action"));


export const simpleRouter = <M extends object> (handler: Handler<M>): Router<M> => ({
    getRoute: (m) => Observable.of({
        action: () => handler(m)
    } as Route)
});

const filteredRouter$ = <M extends object> (... routersOrHandlers: RouterOrHandler<M>[]) =>
    Observable.from(routersOrHandlers)
        .filter(routerOrHandler => !!routerOrHandler)
        .map(routerOrHandler => toRouter(routerOrHandler));

export const first = <M extends object> (... routersOrHandlers: RouterOrHandler<M>[]): Router<M> => ({
    getRoute: (m) =>
        filteredRouter$(... routersOrHandlers).flatMap(
            (router, i) => {
                konsole.log(`first: trying router #${i}`);
                return router.getRoute(m)
                    .do(m => konsole.log(`first: router #${i} succeeded`, m));
            },
            1
        )
        .take(1) // so that we don't keep going through routers after we find one that matches
});

const minRoute: Route = {
    score: 0,
    action: () => console.log("This should never be called")
}

export const best = <M extends object> (... routersOrHandlers: RouterOrHandler<M>[]): Router<M> => ({
    getRoute: (m) =>
        filteredRouter$(... routersOrHandlers).flatMap(
            (router, i) => {
                konsole.log(`best: trying router #${i}`);
                return router.getRoute(m)
                    .do(m => konsole.log(`best: router #${i} succeeded`, m));
            }
        )
        .reduce(
            (prev, current) => Math.min(prev.score === undefined ? 1 : prev.score) > Math.min(current.score === undefined ? 1 : current.score) ? prev : current,
            minRoute
        )
});

export const run = <M extends object> (handler: Handler<M>): Router<M> => ({
    getRoute: (m) =>
        toObservable(handler(m))
            .filter(_ => false)
});

export interface Matcher <M extends object = {}, Z extends object = {}> {
    (message: M): Observableable<Z>;
}

export interface Predicate <M extends object = {}> {
    (message: M): Observableable<boolean>;
}

export function tryMatch <M extends object, N extends object> (matcher: Matcher<M, N>, message: M): Observable<N>;
export function tryMatch <M extends object> (predicate: Predicate<M>, message: M): Observable<M>;
export function tryMatch <M extends object> (predicateOrMatcher: Predicate | Matcher, message: M): Observable<any>;
export function tryMatch(matcherOrPredicate: Matcher | Predicate, message): Observable<any> {
    // we want to allow any matcher to be a predicate (return a boolean)
    // if so, the 'falsey' case will be filtered out by toFilteredObservable,
    // so we just need to catch the case where it is precisely true
    konsole.log("tryMatch", matcherOrPredicate, message);
    return toFilteredObservable(matcherOrPredicate(message))
        .map(m => typeof m === 'boolean' ? message : m);
}

export function matchAll <M extends object, Z extends object> (m1: Matcher<M, Z>): Matcher<M, Z>
export function matchAll <M extends object> (p1: Predicate<M>): Matcher<M, M>

export function matchAll <M extends object, N extends object, Z extends object> (m1: Matcher<M, N>, m2: Matcher<N, Z>): Matcher<M, Z>
export function matchAll <M extends object, Z extends object> (p1: Predicate<M>, m2: Matcher<M, Z>,): Matcher<M, Z>
export function matchAll <M extends object, Z extends object> (m1: Matcher<M, Z>, p2: Predicate<Z>): Matcher<M, Z>
export function matchAll <M extends object> (p1: Predicate<M>, p2: Predicate<M>): Matcher<M, M>

export function matchAll <M extends object, N extends object, O extends object, Z extends object> (m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, Z>): Matcher<M, Z>
export function matchAll <M extends object, N extends object, Z extends object> (p1: Predicate<M>, m2: Matcher<M, N>, m3: Matcher<N, Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll <M extends object, N extends object, Z extends object> (m1: Matcher<M, N>, p2: Predicate<N>, m3: Matcher<N, Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll <M extends object, N extends object, Z extends object> (m1: Matcher<M, N>, m2: Matcher<N, Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll <M extends object, Z extends object> (m1: Matcher<M, Z>, p2: Predicate<Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll <M extends object, Z extends object> (p1: Matcher<M>, m2: Matcher<M, Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll <M extends object, Z extends object> (p1: Predicate<M>, p2: Predicate<M>, m3: Matcher<M, Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll <M extends object> (p1: Predicate<M>, p2: Predicate<M>, p3: Predicate<M>): Matcher<M, M>

export function matchAll <M extends object> (... matchersOrPredicates: (Matcher|Predicate)[]): Matcher<M>

export function matchAll <M extends object> (... args: Matcher[]): Matcher<M> {
    return m => {
        konsole.log("matchAll", args, m)
        return Observable.from(args)
        .reduce<Matcher, Observable<any>> (
            (prevObservable, currentMatcher, i) =>
                prevObservable
                .flatMap(prevMatch => {
                    konsole.log(`calling matcher #${i}`, currentMatcher);
                    return tryMatch(currentMatcher, prevMatch)
                        .do(result => konsole.log("result", result));
                }),
            Observable.of(m)
        )
        .mergeAll();
    }
}

export function matchAny <M extends object> (... predicatesOrMatchers: (Predicate<M> | Matcher<M>)[]): Matcher<M> {
    konsole.log("matchAny", predicatesOrMatchers);
    return m =>
        Observable.from(predicatesOrMatchers)
        .flatMap(predicateOrMatcher => tryMatch(predicateOrMatcher, m), 1)
        .take(1);
}

export function prependMatcher <L extends object, M extends object> (matcher: Matcher<L, M>, routerOrHandler: RouterOrHandler<M>): Router<L>;
export function prependMatcher <M extends object> (predicate: Predicate<M>, routerOrHandler: RouterOrHandler<M>): Router<M>;
export function prependMatcher (matcherOrPredicate: Matcher | Predicate, routerOrHandler: RouterOrHandler): Router<any> {
    return {
        getRoute: (m) =>
            tryMatch(matcherOrPredicate, m)
                .flatMap(m => toRouter(routerOrHandler).getRoute(m))
    };
}

export function ifMatch <M extends object> (routerOrHandler: RouterOrHandler<M>): Router<M>

export function ifMatch <M extends object, Z extends object> (m1: Matcher<M, Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object> (p1: Predicate<M>, routerOrHandler: RouterOrHandler<M>): Router<M>

export function ifMatch <M extends object, N extends object, Z extends object> (m1: Matcher<M, N>, m2: Matcher<N, Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object, Z extends object> (p1: Predicate<M>, m2: Matcher<M, Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object, Z extends object> (m1: Matcher<M, Z>, p2: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object> (p1: Predicate<M>, p2: Matcher<M>, routerOrHandler: RouterOrHandler<M>): Router<M>

export function ifMatch <M extends object, N extends object, O extends object, Z extends object> (m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object, Z extends object> (m1: Matcher<M, Z>, p2: Predicate<Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object, Z extends object> (p1: Matcher<M>, m2: Matcher<M, Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object, Z extends object> (p1: Predicate<M>, p2: Predicate<M>, m3: Matcher<M, Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object, N extends object, Z extends object> (p1: Predicate<M>, m2: Matcher<M, N>, m3: Matcher<N, Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object, N extends object, Z extends object> (m1: Matcher<M, N>, p2: Predicate<N>, m3: Matcher<N, Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object, N extends object, Z extends object> (m1: Matcher<M, N>, m2: Matcher<N, Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): Router<M>
export function ifMatch <M extends object> (p1: Predicate<M>, p2: Predicate<M>, p3: Predicate<M>, routerOrHandler: RouterOrHandler<M>): Router<M>

export function ifMatch <M extends object> (... args: (Predicate | Matcher | RouterOrHandler)[]): Router<M> {
    konsole.log("ifMatch", args);
    const router = toRouter(args[args.length - 1] as RouterOrHandler);
    switch (args.length) {
        case 1:
            return router;
        case 2:
            return prependMatcher(args[0] as Matcher, router);
        default:
            return prependMatcher(matchAll(... args.slice(0, args.length - 1) as Matcher[]), router);
    }
}

export function branchMatch <M extends object> (
    predicate: Predicate<M>,
    ifRouterOrHandler: RouterOrHandler<M>,
    elseRouterOrHandler: RouterOrHandler<M>,
): Router<M>;

export function branchMatch <M extends object, N extends object> (
    matcher: Matcher<M, N>,
    ifRouterOrHandler: RouterOrHandler<N>,
    elseRouterOrHandler: RouterOrHandler<M>,
): Router<M>;

export function branchMatch <M extends object> (
    predicateOrMatcher: Predicate | Matcher,
    ifRouterOrHandler: RouterOrHandler,
    elseRouterOrHandler: RouterOrHandler,
): Router<M> {
    return first(
        ifMatch(predicateOrMatcher, ifRouterOrHandler),
        elseRouterOrHandler
    )
}

export const nullRouter = <M extends object = {}> (): Router<M> => ({
    getRoute: (m) => Observable.empty()
})

const thrownRoute: Route = {
    thrown: true,
    action: () => {}
};

export const throwRoute = <M extends object> (): Router<M> => ({
    getRoute: (m) => Observable.of(thrownRoute)
});

export const catchRoute = <M extends object> (router: Router<M>): Router<M> => ({
    getRoute: (m) => router.getRoute(m)
        .filter(route => !route.thrown)
})
