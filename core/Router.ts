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
    private _route: undefined; // hack so that TypeScript will do better type checking on Routes

    static is (route: any): route is Route {
        return route instanceof Route;
    }
}

export abstract class ScoredRoute extends Route {
    score: number;
    
    constructor (
        score?: number
    ) {
        super();

        this.score = ScoredRoute.normalizedScore(score);
    }

    static normalizedScore(score?: number) {
        return score != null && score >= 0 && score < 1
            ? score
            : 1;
    }

    static is (route: Route): route is ScoredRoute {
        return route instanceof ScoredRoute;
    }

    static combinedScore(score, otherScore) {
        return score * otherScore
    }

    clone(score?: number): this {
        score = ScoredRoute.normalizedScore(score);

        return score === this.score
            ? this
            : Object.assign(Object.create(this.constructor.prototype), this, { score });
    }

    cloneWithCombinedScore(score?: number) {
        return this.clone(ScoredRoute.combinedScore(this.score, ScoredRoute.normalizedScore(score)));
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
}

export function match <VALUE = undefined> (
    value: VALUE,
    score?: number
) {
    return () => new MatchRoute(value, score);
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

export type Router <ARG = undefined, VALUE = undefined> = (arg?: ARG) => Observableable<Route | VALUE>;
export type CompoundRouter <ARG = undefined, VALUE = undefined> = (arg: ARG) => Router<undefined, VALUE>;    
export type AnyRouter <ARG = undefined, VALUE = undefined> = Router<ARG, VALUE> | CompoundRouter<ARG, VALUE>;

export function getRoute$ <ARG, VALUE> (
    router: AnyRouter<ARG, VALUE>,
    arg?: ARG
): Observable<Route> {
    if (router == null)
        return NoRoute.default$;

    if (typeof router !== 'function')
        return Observable.throw(new Error('router must be a function'));

    return Observable.of(router)
        .flatMap(router => toObservable((router as Function)(arg)))
        .flatMap(result => typeof(result) === 'function'
            ? toObservable((result as Function)())
            : Observable.of(result)
        )
        // normalize result
        .map(result => {
            if (result == null)
                return NoRoute.default;

            if (Route.is(result))
                return result;

            return new MatchRoute(result);
        })
}

export function route$ <ARG> (
    router: Router<ARG>,
    value?: ARG
) {
    return getRoute$(router, value)
        .filter(DoRoute.is)
        .flatMap(route => toObservable(route.action()))
        .mapTo(true)
        .defaultIfEmpty(false);
}

export function route <ARG> (
    router: Router<ARG>,
    value?: ARG
) {
    return route$(router, value).toPromise();
}

const strictlyFilterError = new Error("route isn't DoRoute or NoRoute");

function strictlyFilterDo(route: Route): route is DoRoute {
    if (DoRoute.is(route))
        return true;
    if (NoRoute.is(route))
        return false;
    throw strictlyFilterError;
}

export function first (
    ... routers: Router[]
) {
    return () => Observable.from(routers)
        // we put concatMap here because it forces everything after it to execute serially
        .concatMap(router => getRoute$(router))
        .filter(strictlyFilterDo)
        .take(1) // so that we don't keep going through routers after we find one that matches
        .defaultIfEmpty(NoRoute.default);
}

const minRouteError = new Error("minRoute.action should never be called");

const minRoute = new DoRoute(
    () => {
        throw minRouteError;
    },
    0
);

export function best (
    ... routers: Router[]
) {
    return () => new Observable<Route>(observer => {
        let bestRoute = minRoute;

        const subscription = Observable.from(routers)
            // we put concatMap here because it forces everything after it to execute serially
            .concatMap(router => getRoute$(router))
            // early exit if we've already found a winner (score === 1)
            .takeWhile(_ => bestRoute.score < 1)
            .filter(strictlyFilterDo)
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
) {
    return () => toObservable(action())
        .mapTo(NoRoute.default);
}

export function mapRouter <ARG, VALUE, ROUTE extends Route = Route> (
    router: AnyRouter<ARG, VALUE>,
    mapRoute: AnyRouter<ROUTE>
) {
    return (arg: ARG) => getRoute$(router, arg)
        .flatMap(route => getRoute$(mapRoute, route));
}

export interface MapTypeToRouter {
    route: AnyRouter<Route>;
    scored: AnyRouter<ScoredRoute>;
    do: AnyRouter<DoRoute>;
    match: AnyRouter<MatchRoute>;
    no: AnyRouter<NoRoute>;
    default: AnyRouter<Route>;
}

function getRouter (
    route: Route,
    mapTypeToRouter: Partial<MapTypeToRouter>
): AnyRouter {    
    if (mapTypeToRouter["no"] && NoRoute.is(route))
        return mapTypeToRouter["no"];

    if (mapTypeToRouter["do"] && DoRoute.is(route))
        return mapTypeToRouter["do"];
    
    if (mapTypeToRouter["match"] && MatchRoute.is(route))
        return mapTypeToRouter["match"];

    if (mapTypeToRouter["scored"] && ScoredRoute.is(route))
        return mapTypeToRouter["scored"];
    
    if (mapTypeToRouter["route"] && Route.is(route))
        return mapTypeToRouter["route"];

    if (mapTypeToRouter["default"])
        return mapTypeToRouter["default"];

    return route => route;
}

function mapRouteByType (
    mapTypeToRouter: Partial<MapTypeToRouter>
) {
    return (route: Route) => getRoute$(getRouter(route, mapTypeToRouter), route);
}

export function mapRouterByType <ARG, VALUE> (
    router: AnyRouter<ARG, VALUE>,
    mapTypeToRouter: Partial<MapTypeToRouter>
) {
    return mapRouter(router, mapRouteByType(mapTypeToRouter));
}

const mapRouteIdentity = route => route;

const getMatchError = new Error("ifGet's matchRouter should only return MatchRoute or NoRoute");

export function ifGet <VALUE> (
    getMatch: AnyRouter<undefined, VALUE>,
    mapMatchRoute: AnyRouter<MatchRoute<VALUE>>,
    mapNoRoute?: AnyRouter<NoRoute<VALUE>>
) {
    return mapRouterByType(getMatch, {
        match: route => mapRouterByType(mapMatchRoute, {
            scored: _route => _route.cloneWithCombinedScore(route.score)
        })(route),
        no: mapNoRoute || mapRouteIdentity,
        default: () => {
            throw getMatchError;
        }
    });
}

// _if is a special case of ifGet
// value of MatchRoute must be true or false
// if value is false, NoRoute is instead returned

const ifPredicateError = new Error("if's predicate must have value of true or false");
const ifPredicateMatchError = new Error("if's predicate must only return MatchRoute or NoRoute");

function _if (
    predicate: Router<undefined, boolean>,
    mapMatchRoute: AnyRouter<MatchRoute<boolean>>,
    mapNoRoute?: AnyRouter<NoRoute<boolean>>
) {
    return ifGet(
        mapRouterByType(predicate, {
            match: route => {
                if (route.value === true)
                    return route;
                if (route.value === false)
                    return NoRoute.default;
                throw ifPredicateError;
            },
            no: mapRouteIdentity,
            default: () => {
                throw ifPredicateMatchError;
            }
        }),
        mapMatchRoute,
        mapNoRoute
    );
}

export { _if as if }

function _default <ROUTABLE> (
    router: Router,
    mapNoRoute: AnyRouter<NoRoute>
) {
    return mapRouterByType(router, {
        no: mapNoRoute
    });
}

export { _default as default }

const beforeError = new Error("before's router must only return DoRoute or NoRoute");

export function before (
    router: Router,
    action: Action
) {
    return mapRouterByType(router, {
        do: route => new DoRoute(
            () => toObservable(action())
                .flatMap(_ => toObservable(route.action())),
            route.score
        ),
        no: mapRouteIdentity,
        default: () => {
            throw beforeError;
        }
    });
}
const afterError = new Error("after's router must only return DoRoute or NoRoute");

export function after (
    router: Router,
    action: Action
) {
    return mapRouterByType(router, {
        do: route => new DoRoute(
            () => toObservable(route.action())
                .flatMap(_ => toObservable(action())),
            route.score
        ),
        no: mapRouteIdentity,
        default: () => {
            throw afterError;
        }
    });
}

function _switch (
    getKey: Router<undefined, string>,
    mapKeyToRouter: Record<string, Router>
) {
    return ifGet(getKey, match => mapKeyToRouter[match.value]);
}

export { _switch as switch }
