import { konsole } from './Konsole';
import { Observable } from 'rxjs';

export type Observableable<T> = T | Observable<T> | Promise<T>;

export interface Route {
    score?: number;
    action: () => Observableable<any>;
}

export interface Message {
    score?: number
}

export interface IRouter<M extends Message = any> {
    getRoute(message: M): Observable<Route>;
}

export type Matcher<A extends Message = any, Z extends Message = any> = (message: A) => Observableable<Z>;

export type Handler<Z extends Message = any> = (message: Z) => Observableable<any>;

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

export function isRouter<M>(r: IRouter<M> | Handler<M>): r is IRouter<M> {
    return ((r as any).tryMatch !== undefined);
}

export const routerize = <M extends Message = any>(r: IRouter<M> | Handler<M>) => {
    return isRouter(r) ? r : simpleRouter(r);
}

export const matchize = <M extends Message = any>(matcher: Matcher<M>, message: M) => {
    // we want to allow any matcher to be a predicate (return a boolean)
    // if so, the 'falsey' case will be filtered out by toFilteredObservable,
    // so we just need to catch the case where it is precisely true
    return toFilteredObservable(matcher(message))
        .map(m => typeof m === 'boolean' ? message : m);
}

export const callActionIfMatch = <M extends Message = any>(message: M, router: IRouter<M>) => 
    router.getRoute(message)
        .do(route => konsole.log("handle: matched a route", route))
        .flatMap(route => toObservable(route.action()))
        .do(_ => konsole.log("handle: called action"));

export function combineMatchers<M extends Message = any, N extends Message = any>(m1: Matcher<M, N>): Matcher<M, N>
export function combineMatchers<M extends Message = any, N extends Message = any, O extends Message = any>(m1: Matcher<M, N>, m2: Matcher<N, O>): Matcher<M, O>
export function combineMatchers<M extends Message = any, N extends Message = any, O extends Message = any, P extends Message = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, P>): Matcher<M, P>
export function combineMatchers<M extends Message = any, N extends Message = any, O extends Message = any, P extends Message = any, Q extends Message = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, P>, m4: Matcher<P, Q>): Matcher<M, Q>
export function combineMatchers<M extends Message = any>(... matchers: Matcher[]): Matcher<M, any>
export function combineMatchers<M extends Message = any>(... args: Matcher[]): Matcher<M, any> {
    konsole.log("combineMatchers", args);
    return message =>
        Observable.from(args)
        .reduce<Matcher, Observable<Message>>(
            (prevObservable, currentMatcher, i) =>
                prevObservable
                .flatMap(prevMatch => {
                    konsole.log(`calling matcher #${i}`, currentMatcher);
                    return matchize(currentMatcher, prevMatch)
                        .do(result => konsole.log("result", result));
                }),
            Observable.of(message)
        );
}

export const simpleRouter = <M extends Message = any>(handler: Handler<M>) => ({
    getRoute: (message: M) => Observable.of({
        score: message.score,
        action: () => handler(message)
    } as Route)
}) as IRouter<M>;

const filteredRouter$ = <M extends Message = any>(... routers: (IRouter<M> | Handler<M>)[]) =>
    Observable.from(routers)
        .filter(router => !!router)
        .map(router => routerize(router));

export const first = <M extends Message = any>(... routers: (IRouter<M> | Handler<M>)[]) => {
    const router = filteredRouter$(... routers);

    return {
        getRoute: (message: M) =>
            router.flatMap(
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

export const best = <M extends Message = any>(... routers: (IRouter<M> | Handler<M>)[]) => {
    const router = filteredRouter$(... routers);

    return {
        getRoute: (message: M) =>
            router.flatMap(
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

export const prependMatcher = <L extends Message = any, M extends Message = any>(matcher: Matcher<L, M>, router: IRouter<M>) => ({
    getRoute: (message: L) =>
        matchize(matcher, message)
            .flatMap((m: M) => router.getRoute(m))
    } as IRouter<L>);

export const run = <M extends Message = any>(handler: Handler<M>) => ({
    getRoute: (message: M) =>
        toObservable(handler(message))
        .map(_ => null)
    } as IRouter<M>);

export interface Predicate<M extends Message = any> {
    (message: M): Observableable<boolean>;
}

export function router<M extends Message = any>(handler: Handler<M> | IRouter<M>): IRouter<M>

export function router<M extends Message = any>(p1: Predicate<M>, handler: Handler<M> | IRouter<M>): IRouter<M>
export function router<M extends Message = any, Z extends Message = any>(m1: Matcher<M, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>

export function router<M extends Message = any, Z extends Message = any>(p1: Predicate<M>, m2: Matcher<M, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function router<M extends Message = any, Z extends Message = any>(m1: Matcher<M, Z>, p2: Predicate<Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function router<M extends Message = any, N extends Message = any, Z extends Message = any>(m1: Matcher<M, N>, m2: Matcher<N, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>

export function router<M extends Message = any, Z extends Message = any>(m1: Matcher<M, Z>, p2: Predicate<Z>, p3: Predicate<Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function router<M extends Message = any, Z extends Message = any>(p1: Matcher<M>, m2: Matcher<M, Z>, p3: Predicate<Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function router<M extends Message = any, Z extends Message = any>(p1: Predicate<M>, p2: Predicate<M>, m3: Matcher<M, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function router<M extends Message = any, N extends Message = any, Z extends Message = any>(p1: Predicate<M>, m2: Matcher<M, N>, m3: Matcher<N, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function router<M extends Message = any, N extends Message = any, Z extends Message = any>(m1: Matcher<M, N>, p2: Predicate<N>, m3: Matcher<N, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function router<M extends Message = any, N extends Message = any, Z extends Message = any>(m1: Matcher<M, N>, m2: Matcher<N, Z>, p3: Predicate<Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>
export function router<M extends Message = any, N extends Message = any, O extends Message = any, Z extends Message = any>(m1: Matcher<M, N>, m2: Matcher<N, O>, m3: Matcher<O, Z>, handler: Handler<Z> | IRouter<Z>): IRouter<M>

export function router<M extends Message = any>(... args: (Predicate | Matcher | Handler | IRouter)[]): IRouter<M> {
    const routerOrHandler = routerize(args[args.length - 1] as Handler | IRouter);
    switch (args.length) {
        case 1:
            return routerOrHandler;
        case 2:
            return prependMatcher(args[0] as Matcher, routerOrHandler);
        default:
            return prependMatcher(combineMatchers(... args.slice(0, args.length - 1) as Matcher[]), routerOrHandler);
    }
}
