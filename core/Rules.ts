import { konsole } from './Konsole';
import { Observable } from 'rxjs';

export type Observableable<T> = T | Observable<T> | Promise<T>;

export interface Route {
    score?: number;
    thrown?: true;
    action: () => Observableable<any>;
}

export interface IRouter<M extends object = any> {
    getRoute(message: M): Observable<Route>;
}

export type Matcher<A extends object = any, Z extends object = any> = (message: A) => Observableable<Z>;

export type Handler<Z extends object = any> = (message: Z) => Observableable<any>;

export const arrayize = <T>(stuff: T | T[]) => Array.isArray(stuff) ? stuff : [stuff];

export const toFilteredObservable = <T>(t: Observableable<T>) => {
    if (!t)
        return Observable.empty<T>();
    if (t instanceof Observable)
        return t.filter(i => !!i);
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t).filter(i => !!i);
    return Observable.of(t);
}

export const toObservable = <T>(t: Observableable<T>) => {
    if (t instanceof Observable)
        return t;
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t);
    return Observable.of(t);
}

export type RouterOrHandler<M extends object = any> = IRouter<M> | Handler<M>;

export function isRouter<M extends object = any>(routerOrHandler: RouterOrHandler<M>): routerOrHandler is IRouter<M> {
    return ((routerOrHandler as any).getRoute !== undefined);
}

export const routerize = <M extends object = any>(routerOrHandler: RouterOrHandler<M>) => {
    return isRouter(routerOrHandler) ? routerOrHandler : simpleRouter(routerOrHandler);
}

export const matchize = <M extends object = any>(matcher: Matcher<M>, message: M) => {
    // we want to allow any matcher to be a predicate (return a boolean)
    // if so, the 'falsey' case will be filtered out by toFilteredObservable,
    // so we just need to catch the case where it is precisely true
    konsole.log("matchize", matcher, message);
    return toFilteredObservable(matcher(message))
        .map(m => typeof m === 'boolean' ? message : m);
}

export const routeMessage = <M extends object = any>(router: IRouter<M>, message: M) => 
    router.getRoute(message)
        .do(route => konsole.log("handle: matched a route", route))
        .flatMap(route => toObservable(route.action()))
        .do(_ => konsole.log("handle: called action"));

export function matchAll<M extends object = any>(p1: Predicate<M>): Matcher<M>
export function matchAll<M extends object = any, Z extends object = any>(m1: Matcher<M, Z>): Matcher<M, Z>

export function matchAll<M extends object = any>(p1: Predicate<M>, p2: Predicate<M>): Matcher<M>
export function matchAll<M extends object = any, Z extends object = any>(p1: Predicate<M>, m2: Matcher<M, Z>,): Matcher<M, Z>
export function matchAll<M extends object = any, Z extends object = any>(m1: Matcher<M, Z>, p2: Predicate<Z>): Matcher<M, Z>
export function matchAll<M extends object = any, N extends object = any, Z extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, Z>): Matcher<M, Z>

export function matchAll<M extends object = any>(p1: Predicate<M>, p2: Predicate<M>, p3: Predicate<M>): Matcher<M>
export function matchAll<M extends object = any, Z extends object = any>(m1: Matcher<M, Z>, p2: Predicate<Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll<M extends object = any, Z extends object = any>(p1: Matcher<M>, m2: Matcher<M, Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll<M extends object = any, Z extends object = any>(p1: Predicate<M>, p2: Predicate<M>, m3: Matcher<M, Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll<M extends object = any, N extends object = any, Z extends object = any>(p1: Predicate<M>, m2: Matcher<M, N>, m3: Matcher<N, Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll<M extends object = any, N extends object = any, Z extends object = any>(m1: Matcher<M, N>, p2: Predicate<N>, m3: Matcher<N, Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll<M extends object = any, N extends object = any, Z extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): Matcher<M, Z>
export function matchAll<M extends object = any, N extends object = any, O extends object = any, Z extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, Z>): Matcher<M, Z>

export function matchAll<M extends object = any>(... matchersOrPredicates: (Matcher|Predicate)[]): Matcher<M>

export function matchAll<M extends object = any>(... args: Matcher[]): Matcher<M> {
    return m => {
        konsole.log("matchAll", args, m)
        return Observable.from(args)
        .reduce<Matcher, Observable<any>>(
            (prevObservable, currentMatcher, i) =>
                prevObservable
                .flatMap(prevMatch => {
                    konsole.log(`calling matcher #${i}`, currentMatcher);
                    return matchize(currentMatcher, prevMatch)
                        .do(result => konsole.log("result", result));
                }),
            Observable.of(m)
        )
        .mergeAll();
    }
}

export function matchAny<M extends object = any>(... predicatesOrMatchers: (Predicate<M> | Matcher<M>)[]): Matcher<M> {
    konsole.log("matchAny", predicatesOrMatchers);
    return m =>
        Observable.from(predicatesOrMatchers)
        .flatMap(predicateOrMatcher => matchize(predicateOrMatcher, m), 1)
        .take(1);
}

export const simpleRouter = <M extends object = any>(handler: Handler<M>) => ({
    getRoute: (message: M) => Observable.of({
        action: () => handler(message)
    } as Route)
}) as IRouter<M>;

const filteredRouter$ = <M extends object = any>(... routersOrHandlers: (RouterOrHandler<M>)[]) =>
    Observable.from(routersOrHandlers)
        .filter(routerOrHandler => !!routerOrHandler)
        .map(routerOrHandler => routerize(routerOrHandler));

export const first = <M extends object = any>(... routersOrHandlers: (RouterOrHandler<M>)[]) => {
    const router$ = filteredRouter$(... routersOrHandlers);

    return {
        getRoute: (message: M) =>
            router$.flatMap(
                (router, i) => {
                    konsole.log(`first: trying router #${i}`);
                    return router.getRoute(message)
                        .do(m => konsole.log(`first: router #${i} succeeded`, m));
                },
                1
            )
            .take(1) // so that we don't keep going through routers after we find one that matches
    } as IRouter<M>;
}

const minRoute: Route = {
    score: 0,
    action: () => console.log("This should never be called")
}

export const best = <M extends object = any>(... routersOrHandlers: (RouterOrHandler<M>)[]) => {
    const router$ = filteredRouter$(... routersOrHandlers);

    return {
        getRoute: (message: M) =>
            router$.flatMap(
                (router, i) => {
                    konsole.log(`best: trying router #${i}`);
                    return router.getRoute(message)
                        .do(m => konsole.log(`best: router #${i} succeeded`, m));
                }
            )
            .reduce(
                (prev, current) => Math.min(prev.score === undefined ? 1 : prev.score) > Math.min(current.score === undefined ? 1 : current.score) ? prev : current,
                minRoute
            )
    } as IRouter<M>;
}

export const prependMatcher = <L extends object = any, M extends object = any>(matcher: Matcher<L, M>, router: IRouter<M>) => ({
    getRoute: (message: L) =>
        matchize(matcher, message)
            .flatMap((m: M) => router.getRoute(m))
    } as IRouter<L>);

export const run = <M extends object = any>(handler: Handler<M>) => ({
    getRoute: (message: M) =>
        toObservable(handler(message))
            .filter(_ => false)
    } as IRouter<M>);

export interface Predicate<M extends object = any> {
    (message: M): Observableable<boolean>;
}

export function ifMatch<M extends object = any>(handler: Handler<M> | IRouter<M>): IRouter<M>

export function ifMatch<M extends object = any>(p1: Predicate<M>, routerOrHandler: RouterOrHandler<M>): IRouter<M>
export function ifMatch<M extends object = any, Z extends object = any>(m1: Matcher<M, Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>

export function ifMatch<M extends object = any>(p1: Predicate<M>, p2: Matcher<M>, routerOrHandler: RouterOrHandler<M>): IRouter<M>
export function ifMatch<M extends object = any, Z extends object = any>(p1: Predicate<M>, m2: Matcher<M, Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>
export function ifMatch<M extends object = any, Z extends object = any>(m1: Matcher<M, Z>, p2: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>
export function ifMatch<M extends object = any, N extends object = any, Z extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>

export function ifMatch<M extends object = any>(p1: Predicate<M>, p2: Predicate<M>, p3: Predicate<M>, routerOrHandler: RouterOrHandler<M>): IRouter<M>
export function ifMatch<M extends object = any, Z extends object = any>(m1: Matcher<M, Z>, p2: Predicate<Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>
export function ifMatch<M extends object = any, Z extends object = any>(p1: Matcher<M>, m2: Matcher<M, Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>
export function ifMatch<M extends object = any, Z extends object = any>(p1: Predicate<M>, p2: Predicate<M>, m3: Matcher<M, Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>
export function ifMatch<M extends object = any, N extends object = any, Z extends object = any>(p1: Predicate<M>, m2: Matcher<M, N>, m3: Matcher<N, Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>
export function ifMatch<M extends object = any, N extends object = any, Z extends object = any>(m1: Matcher<M, N>, p2: Predicate<N>, m3: Matcher<N, Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>
export function ifMatch<M extends object = any, N extends object = any, Z extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, Z>, p3: Predicate<Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>
export function ifMatch<M extends object = any, N extends object = any, O extends object = any, Z extends object = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, Z>, routerOrHandler: RouterOrHandler<Z>): IRouter<M>

export function ifMatch<M extends object = any>(... args: (Predicate | Matcher | RouterOrHandler)[]): IRouter<M> {
    konsole.log("ifMatch", args);
    const router = routerize(args[args.length - 1] as RouterOrHandler);
    switch (args.length) {
        case 1:
            return router;
        case 2:
            return prependMatcher(args[0] as Matcher, router);
        default:
            return prependMatcher(matchAll(... args.slice(0, args.length - 1) as Matcher[]), router);
    }
}

export function branchMatch<M extends object = any>(
    predicate: (Predicate<M>),
    ifRouterOrHandler: RouterOrHandler<M>,
    elseRouterOrHandler: RouterOrHandler<M>,
): IRouter<M>;

export function branchMatch<M extends object = any, N extends object = any>(
    matcher: (Matcher<M, N>),
    ifRouterOrHandler: RouterOrHandler<N>,
    elseRouterOrHandler: RouterOrHandler<M>,
): IRouter<M>;

export function branchMatch<M extends object = any>(
    predicateOrMatcher: (Predicate<M> | Matcher<M>),
    ifRouterOrHandler: RouterOrHandler<M>,
    elseRouterOrHandler: RouterOrHandler<M>,
): IRouter<M> {
    return first(
        ifMatch(predicateOrMatcher, ifRouterOrHandler),
        elseRouterOrHandler
    )
}

// export const createAll = <M extends object = any>(postMessage:(m: M) => Promise<void>) => (... routersOrHandlers: (RouterOrHandler<M>)[]) => {
//     const router$ = filteredRouter$(... routersOrHandlers);

//     return {
//         getRoute: (m: M) =>
//             router$.count()
//                 .flatMap(count =>
//                     router$.flatMap(
//                         (router, i) => {
//                             konsole.log(`all: trying router #${i}`);
//                             return router.getRoute(m)
//                                 .map(route => i < count - 1
//                                     ? {
//                                         ... route,
//                                         action: () => toObservable(route.action())
//                                             .flatMap(_ => postMessage(m))
//                                     } as Route
//                                     : route
//                                 )
//                                 .do(m => konsole.log(`all: router #${i} succeeded`, m));
//                         },
//                         1
//                     )
//                     .take(1) // so that we don't keep going through routers after we find one that matches
//                 )
//     } as IRouter<M>;
// }

const thrownRoute: Route = {
    thrown: true,
    action: () => {}
};

export const throwRoute = <M extends object = any>(): IRouter<M> => ({
    getRoute: (m: M) => Observable.of(thrownRoute)
});

export const catchRoute = <M extends object = any>(router: IRouter<M>): IRouter<M> => ({
    getRoute: (m: M) => router.getRoute(m)
        .filter(route => !route.thrown)
})