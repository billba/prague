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

export interface Routable {
    score?: number;
}

export interface Handler <Z extends Routable = {}> {
    (m: Z): Observableable<any>;
}

export type RouterOrHandler <M extends Routable = {}> = Router<M> | Handler<M>;

export class Router <M extends Routable> {
    constructor(public getRoute: (m: M) => Observable<Route>) {}

    static fromHandler <M extends Routable> (handler: Handler<M>) {
        return new Router<M>(m => Observable.of({
            action: () => handler(m)
        } as Route));
    }
    
    static null = new Router<any>(m => Observable.empty());

    static from <M extends Routable> (routerOrHandler: RouterOrHandler<M>): Router<M> {
        return routerOrHandler
            ? routerOrHandler instanceof Router
                ? routerOrHandler
                : Router.fromHandler(routerOrHandler)
            : Router.null;
    }

    static routersFrom <M extends Routable> (routersOrHandlers: RouterOrHandler<M>[]) {
        return routersOrHandlers
            .map(routerOrHandler => Router.from(routerOrHandler));
    }
    
    route (m: M) {
        return this.getRoute(m)
            .do(route => konsole.log("route: returned a route", route))
            .flatMap(route => toObservable(route.action()))
            .do(_ => konsole.log("route: called action"));
    }
}

export class FirstRouter <M extends Routable> extends Router<M> {
    constructor (... routersOrHandlers: RouterOrHandler<M>[]) {
        const router$ = Observable.from(Router.routersFrom(routersOrHandlers));
        super(m => router$
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
}

export function first <M extends Routable> (... routersOrHandlers: RouterOrHandler<M>[]) {
    return new FirstRouter(... routersOrHandlers);
}

const minRoute: Route = {
    score: 0,
    action: () => console.warn("This should never be called")
}

export function toScore (score: number) {
    return score == null ? 1 : score;
}

export class BestRouter <M extends Routable> extends Router<M> {
    constructor(... routersOrHandlers: RouterOrHandler<M>[]) {
        const router$ = Observable.from(Router.routersFrom(routersOrHandlers)); 
        super(m => new Observable<Route>(observer => {
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
}

export function best <M extends Routable> (... routersOrHandlers: RouterOrHandler<M>[]) {
    return new BestRouter(... routersOrHandlers);
}

export class RunRouter <M extends Routable> extends Router<M> {
    constructor(handler: Handler<M>) {
        super(m => toObservable(handler(m))
            .filter(_ => false)
        );
    }
}

export function run <M extends Routable> (handler: Handler<M>) {
    return new RunRouter(handler);
}

export interface Predicate <M extends Routable = {}> {
    (m: M): Observableable<boolean>;
}

export function routeWithCombinedScore(route: Route, newScore: number) {
    const score = toScore(newScore) * toScore(route.score);

    return toScore(route.score) === score
        ? route
        : {
            ... route,
            score
        } as Route;
}

export class IfDoRouter <M extends Routable> extends Router<M> {
    constructor (
        predicate: Predicate<M>,
        ifRouterOrHandler: RouterOrHandler<M>,
        elseRouterOrHandler?: RouterOrHandler<M>,
    ) {
        const ifRouter = Router.from(ifRouterOrHandler);
        const elseRouter = Router.from(elseRouterOrHandler);

        super(m => toObservable(predicate(m))
            .flatMap(n => n
                ? ifRouter.getRoute(m)
                : elseRouter.getRoute(m)
            )
        );
    }
}

export function ifDo <M extends Routable> (
    predicate: Predicate<M>,
    ifRouterOrHandler: RouterOrHandler<M>,
    elseRouterOrHandler?: RouterOrHandler<M>
): IfDoRouter<M> {
    return new IfDoRouter(predicate, ifRouterOrHandler, elseRouterOrHandler);
}

export interface Matcher <M extends Routable = {}, Z extends Routable = {}> {
    (m: M): Observableable<Z>;
}

export class IfMatchRouter <M extends Routable, N extends Routable> extends Router<M> {
    constructor (
        matcher: Matcher<M, N>,
        ifRouterOrHandler: RouterOrHandler<N>,
        elseRouterOrHandler?: RouterOrHandler<M>
    ) {
        const ifRouter = Router.from(ifRouterOrHandler);
        const elseRouter = Router.from(elseRouterOrHandler);

        super(m => toObservable(matcher(m))
            .flatMap(n => n
                ? ifRouter.getRoute(n)
                    .map(route => routeWithCombinedScore(route, n.score))    
                : elseRouter.getRoute(m)
            )
        );
    }
}

export function ifMatch <M extends Routable, N extends Routable> (
    matcher: Matcher<M, N>,
    ifRouterOrHandler: RouterOrHandler<N>,
    elseRouterOrHandler?: RouterOrHandler<M>
): IfMatchRouter<M, N> {
    return new IfMatchRouter(matcher, ifRouterOrHandler, elseRouterOrHandler);
}

const thrownRoute: Route = {
    thrown: true,
    action: () => {}
};

export function throwRoute <M extends Routable> () {
    return new Router<M>(m => Observable.of(thrownRoute));
}

export function catchRoute <M extends Routable> (routerOrHandler: RouterOrHandler<M>): Router<M> {
    return new Router<M>(m => Router.from(routerOrHandler)
        .getRoute(m)
        .filter(route => !route.thrown)
    );
}

export class BeforeRouter <M extends Routable> extends Router<M> {
    constructor (beforeHandler: Handler<M>, routerOrHandler: RouterOrHandler<M>) {
        const router = Router.from(routerOrHandler);
        super(m => router.getRoute(m)
            .map(route => ({
                ... route,
                action: () => toObservable(beforeHandler(m))
                    .flatMap(_ => toObservable(route.action()))
            }))
        );
    }
}

export function before <M extends Routable> (beforeHandler: Handler<M>, routerOrHandler: RouterOrHandler<M>) {
    return new BeforeRouter(beforeHandler, routerOrHandler);
}

export class AfterRouter <M extends Routable> extends Router<M> {
    constructor (routerOrHandler: RouterOrHandler<M>, afterHandler: Handler<M>) {
        const router = Router.from(routerOrHandler);
        super(m => router.getRoute(m)
            .map(route => ({
                ... route,
                action: () => toObservable(route.action())
                    .flatMap(_ => toObservable(afterHandler(m)))
            }))
        );
    }
}

export function after <M extends Routable> (routerOrHandler: RouterOrHandler<M>, afterHandler: Handler<M>) {
    return new AfterRouter(routerOrHandler, afterHandler);
}

