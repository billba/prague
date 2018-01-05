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

export abstract class Route <VALUE = any> {
    private _route: undefined; // hack so that TypeScript will do better type checking on Routes

    static is <VALUE> (route: any): route is Route<VALUE> {
        return route instanceof Route;
    }
}

export class ScoredRoute <VALUE = any> extends Route<VALUE> {
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

export class DoRoute extends ScoredRoute<undefined> {
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

export function _do <VALUE = any> (
    action: (value?: VALUE) => Observableable<any>,
    score?: number
) {
    return (value: VALUE) => new DoRoute(() => action(value), score);
}

export class MatchRoute <VALUE = any> extends ScoredRoute<VALUE> {
    constructor(
        public value: VALUE,
        score?: number
    ) {
        super(score);
    }

    static is <VALUE = any> (route: Route<VALUE>): route is MatchRoute<VALUE> {
        return route instanceof MatchRoute;
    }
}

export function _match <VALUE = any> (
    value: VALUE,
    score?: number
) {
    return () => new MatchRoute(value, score);
}

export class NoRoute <VALUE = any> extends Route<VALUE> {
    static defaultReason = "none";
    
    constructor (
        public reason = NoRoute.defaultReason,
        public value?: VALUE
    ) {
        super();
    }

    static default = new NoRoute();

    static default$ = Observable.of(NoRoute.default);

    static is <VALUE = any> (route: Route): route is NoRoute<VALUE> {
        return route instanceof NoRoute;
    }
}

export function _no <VALUE> (
    reason?: string,
    value?: VALUE
) {
    return () => new NoRoute(reason, value);
}

export type Router <ARG = undefined, VALUE = any> = (arg?: ARG) => Observableable<Route<VALUE> | VALUE>;

const getRouteError = new Error('router must be a function');

export function getRoute$ <ARG, VALUE> (
    router: Router<ARG, VALUE>,
    arg?: ARG
): Observable<Route<VALUE>> {
    if (router == null)
        return NoRoute.default$;

    if (typeof router !== 'function')
        return Observable.throw(getRouteError);

    return Observable
        .of(router)
        .flatMap(router => toObservable(router(arg)))
        // normalize result
        .map(result => {
            if (result == null)
                return NoRoute.default;

            if (Route.is(result))
                return result;

            return new MatchRoute(result);
        })
}

export function mapRoute$ <ARG, VALUE, ROUTE extends Route<VALUE> = Route<VALUE>> (
    router: Router<ARG, VALUE>,
    mapRoute: Router<ROUTE>,
    arg?: ARG
) {
    return getRoute$(router, arg)
        .flatMap(route => getRoute$(mapRoute, route));
}

export function route$ <ARG, VALUE> (
    router: Router<ARG, VALUE>,
    arg?: ARG
) {
    return getRoute$(router, arg)
        .filter(DoRoute.is)
        .flatMap(route => toObservable(route.action()))
        .mapTo(true)
        .defaultIfEmpty(false);
}

const strictlyFilterError = new Error("route isn't DoRoute or NoRoute");

function strictlyFilterScored(route: Route): route is ScoredRoute {
    if (ScoredRoute.is(route))
        return true;
    if (NoRoute.is(route))
        return false;
    throw strictlyFilterError;
}

export function _first <VALUE> (
    ... routers: Router<undefined, VALUE>[]
): Observable<Route<VALUE>> {
    return Observable.from(routers)
        // we put concatMap here because it forces everything after it to execute serially
        .concatMap(router => getRoute$(router))
        .filter(strictlyFilterScored)
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

export function _best  <VALUE = any> (
    ... routers: Router<VALUE> []
): Observable<Route<VALUE>> {
    return new Observable<Route>(observer => {
        let bestRoute: ScoredRoute = minRoute;

        const subscription = Observable.from(routers)
            // we put concatMap here because it forces everything after it to execute serially
            .concatMap(router => getRoute$(router))
            // early exit if we've already found a winner (score === 1)
            .takeWhile(_ => bestRoute.score < 1)
            .filter(strictlyFilterScored)
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

export interface MapTypeToRouteClass <VALUE> {
    route: Route<VALUE>,
    scored: ScoredRoute<VALUE>,
    do: DoRoute,
    match: MatchRoute<VALUE>,
    no: NoRoute<VALUE>,
    default: Route,
}

export type RouteTypes <VALUE> = keyof MapTypeToRouteClass<VALUE>;

export function* getTypesFromRoute(
    route: Route
) {
    if (NoRoute.is(route))
        yield 'no';
    
    if (DoRoute.is(route))
        yield 'do';
    
    if (MatchRoute.is(route))
        yield 'match';

    if (ScoredRoute.is(route))
        yield 'scored';
    
    if (Route.is(route))
        yield 'route';
    
    yield 'default';
}

export type MapTypeToRouter <VALUE> = { [P in RouteTypes<VALUE>]: Router<MapTypeToRouteClass<VALUE>[P]> }

function getRouteByType <VALUE> (
    route: Route<VALUE>,
    mapTypeToRouter: Partial<MapTypeToRouter<VALUE>>
): Observableable<Route> {
    for (let type of getTypesFromRoute(route)) {
        const router = mapTypeToRouter[type];
        if (router)
            return getRoute$(router, route);
    }

    return route;
}

export function mapRouteByType$ <ARG, VALUE> (
    router: Router<ARG, VALUE>,
    mapTypeToRouter: Partial<MapTypeToRouter<VALUE>>,
    arg?: ARG
) {
    return mapRoute$(router, route => getRouteByType(route, mapTypeToRouter), arg);
}

const mapRouteIdentity = route => route;

const getMatchError = new Error("ifGet's matchRouter should only return MatchRoute or NoRoute");

export function _ifGet <VALUE> (
    getMatch: Router<undefined, VALUE>,
    mapMatchRoute: Router<MatchRoute<VALUE>>,
    mapNoRoute?: Router<NoRoute<VALUE>>
) {
    return mapRouteByType$(getMatch, {
        match: route => mapRouteByType$(
            mapMatchRoute, {
                scored: _route => _route.cloneWithCombinedScore(route.score)
            },
            route
        ),
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

export function _if (
    predicate: Router<undefined, boolean>,
    mapMatchRoute: Router<MatchRoute<boolean>>,
    mapNoRoute?: Router<NoRoute<boolean>>
) {
    return _ifGet<boolean>(
        () => mapRouteByType$(
            predicate, {
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
            }
        ),
        mapMatchRoute,
        mapNoRoute
    );
}

export function _ifNo <ARG, VALUE> (
    router: Router<ARG, VALUE>,
    mapNoRoute: Router<NoRoute<VALUE>>
) {
    return mapRouteByType$(router, {
        no: mapNoRoute
    });
}

const beforeError = new Error("before's router must only return DoRoute or NoRoute");

export function _before <ARG, VALUE> (
    router: Router<ARG, VALUE>,
    action: Action
) {
    return mapRouteByType$(router, {
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

export function _after <ARG, VALUE> (
    router: Router<ARG, VALUE>,
    action: Action
) {
    return mapRouteByType$(router, {
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

export function _switch (
    getKey: Router<undefined, string>,
    mapKeyToRouter: Record<string, Router>
) {
    return _ifGet(getKey, match => getRoute$(mapKeyToRouter[match.value]));
}
