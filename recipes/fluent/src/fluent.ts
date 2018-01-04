import { _first, _best, _if, _ifGet, _ifNo, _before, _after, Action, Route, ScoredRoute, MatchRoute, DoRoute, NoRoute, Router, Observableable, toObservable, getRoute$, mapRoute$, route$, RouteTypes, getTypesFromRoute, MapTypeToRouteClass } from 'prague';
import { Observable } from 'rxjs';

export * from 'prague';

export type AnyRouter <ARG = undefined, VALUE = any> = Router<ARG, VALUE> | FluentRouter<ARG, VALUE>;

export type FlexRouter <ARG = undefined, VALUE = any> = AnyRouter<ARG, VALUE> | ((arg?: ARG) => Observableable<FluentRouter>);

export type MapTypeToFlexRouter = { [P in RouteTypes]: FlexRouter<MapTypeToRouteClass[P]> }

function getRouteByType (
    route: Route,
    mapTypeToFlexRouter: Partial<MapTypeToFlexRouter>
): Observableable<Route> {
    for (let type of getTypesFromRoute(route)) {
        const router = mapTypeToFlexRouter[type];
        if (router)
            return FluentRouter.flexRouterToRouter(router)(route);
    }

    return route;
}

export class FluentRouter <ARG = undefined, VALUE = any> {
    constructor(public router: Router<ARG, VALUE>) {
    }

    static from <VALUE> (route: MatchRoute<VALUE> | NoRoute<VALUE>): FluentRouter<undefined, VALUE>;
    static from (route: Route): FluentRouter<undefined, any>;
    static from (route: Route)
    {
        return new FluentRouter(() => route);
    }

    static is <ARG, VALUE, T> (router: T | FluentRouter<ARG, VALUE>): router is FluentRouter<ARG, VALUE> {
        return router instanceof FluentRouter;
    }

    static anyRouterToRouter <ARG, VALUE> (
        router: AnyRouter<ARG, VALUE>
    ) {
        return FluentRouter.is(router)
            ? router.router
            : router
    }

    static flexRouterToRouter <ARG, VALUE> (
        router: FlexRouter<ARG, VALUE>
    ): Router<ARG, VALUE> {
        if (router == null)
            return;

        return FluentRouter.is(router)
            ? router.router
            : (arg: ARG) => Observable
                .of(router)
                .map(router => router(arg))
                .flatMap(toObservable)
                .flatMap(result => FluentRouter.is(result)
                    ? toObservable(result.router())
                    : Observable.of(result)
                );
    }

    static toRouters(routers: AnyRouter[]) {
        return routers.map(FluentRouter.anyRouterToRouter);
    }

    toObservable(arg?: ARG) {
        return getRoute$(this.router, arg);
    }

    toPromise(arg?: ARG) {
        return toObservable(arg).toPromise();
    }

    route$ (arg?: ARG) {
        return route$(this.router, arg);
    }

    route (arg?: ARG) {
        return this.route$(arg)
            .toPromise();
    }

    map (mapRoute: AnyRouter<Route>) {
        return new FluentRouter(() => mapRoute$(this.router, FluentRouter.anyRouterToRouter(mapRoute)));
    }

    mapByType (
        mapTypeToFlexRouter: Partial<MapTypeToFlexRouter>
    ) {
        return this.map(route => getRouteByType(route, mapTypeToFlexRouter));
    }

    do (fn: (route: Route) => Observableable<any>) {
        return this.map(route => toObservable(fn(route))
            .mapTo(route)
        );
    }

    default (
        router: FlexRouter<NoRoute>
    ) {
        return this.mapByType({ no: router });
    }
}

export function first (
        ... routers: AnyRouter[]
) {
    return new FluentRouter(() => _first(
        ... FluentRouter.toRouters(routers)
    ));
}

export function best(
    ... routers: AnyRouter[]
) {
    return new FluentRouter(() => _best(
        ... FluentRouter.toRouters(routers)
    ));
}

export function ifGet <VALUE> (
    getMatch: AnyRouter<undefined, VALUE>,
    mapMatchRoute: FlexRouter<MatchRoute<VALUE>>,
    mapNoRoute?: FlexRouter<NoRoute<VALUE>>
) {
    return new FluentRouter(() => _ifGet(
        FluentRouter.anyRouterToRouter(getMatch),
        FluentRouter.flexRouterToRouter(mapMatchRoute),
        FluentRouter.flexRouterToRouter(mapNoRoute)
    ));
}

function if_ (
    predicate: AnyRouter<undefined, boolean>,
    mapMatchRoute: FlexRouter<MatchRoute<boolean>>,
    mapNoRoute?: FlexRouter<NoRoute<boolean>>
) {
    return new FluentRouter(() => _if(
        FluentRouter.anyRouterToRouter(predicate),
        FluentRouter.flexRouterToRouter(mapMatchRoute),
        FluentRouter.flexRouterToRouter(mapNoRoute)
    ));
}

export { if_ as if }

export function ifNo <ARG, VALUE> (
    router: AnyRouter<ARG, VALUE>,
    mapNoRoute: FlexRouter<NoRoute>
) {
    return new FluentRouter(() => _ifNo(
        FluentRouter.anyRouterToRouter(router),
        FluentRouter.flexRouterToRouter(mapNoRoute)
    ));
}

export function before <ARG, VALUE> (
    router: AnyRouter<ARG, VALUE>,
    action: Action
) {
    return new FluentRouter(() => _before(
        FluentRouter.anyRouterToRouter(router),
        action
    ));
}

export function after <ARG, VALUE> (
    router: AnyRouter<ARG, VALUE>,
    action: Action
) {
    return new FluentRouter(() => _after(
        FluentRouter.anyRouterToRouter(router),
        action
    ));
}

function switch_ (
    getKey: AnyRouter<undefined, string>,
    mapKeyToRouter: Record<string, AnyRouter>
) {
    return ifGet(getKey, match => getRoute$(FluentRouter.anyRouterToRouter(mapKeyToRouter[match.value])));
}

export { switch_ as switch }

function do_ <ARG = undefined> (
    action: (arg?: ARG) => Observableable<any>,
    score?: number
) {
    return new FluentRouter<ARG>((arg?: ARG) => new DoRoute(() => action(arg), score));
}

export { do_ as do }

export function match <VALUE = any> (
    value: VALUE,
    score?: number
) {
    return new FluentRouter(() => new MatchRoute(value, score));
}

function no_ <VALUE> (
    reason?: string,
    value?: VALUE
) {
    return new FluentRouter(() => new NoRoute(reason, value));
}

export { no_ as no }

// export class IfMatchesThen <ROUTABLE, VALUE> extends Router<ROUTABLE> {
//     constructor(
//         private matcher: Matcher<ROUTABLE, VALUE>,
//         private getThenRouter: (routable: ROUTABLE, value: VALUE) => Router<ROUTABLE>
//     ) {
//         super(Router.getRouteIfMatches$(matcher, getThenRouter));
//     }

//     elseDo(
//         elseHandler: (routable: ROUTABLE, reason: string) => Observableable<any>,
//         score?: number
//     ) {
//         return this.elseTry((_routable, reason) => Router.do(routable => elseHandler(routable, reason), score));
//     }

//     elseTry(elseRouter: Router<ROUTABLE>): Router<ROUTABLE>;

//     elseTry(getElseRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>): Router<ROUTABLE>;

//     elseTry(arg: Router<ROUTABLE> | ((routable: ROUTABLE, reason: string) => Router<ROUTABLE>)) {
//         return new Router(Router.getRouteIfMatches$(this.matcher, this.getThenRouter, typeof(arg) === 'function'
//             ? arg
//             : (routable, reason) => arg
//         ));
//     }
// }

// export class IfMatchesFluent <ROUTABLE, VALUE> {
//     constructor (
//         private matcher: Matcher<ROUTABLE, VALUE>
//     ) {
//     }

//     and (predicate: (value: VALUE) => IfTrueFluent<ROUTABLE>): IfMatchesFluent<ROUTABLE, VALUE>;

//     and (predicate: IfTrueFluent<ROUTABLE>): IfMatchesFluent<ROUTABLE, VALUE>;

//     and <TRANSFORMRESULT> (recognizer: (value: VALUE) => IfMatchesFluent<ROUTABLE, TRANSFORMRESULT>): IfMatchesFluent<ROUTABLE, TRANSFORMRESULT>;

//     and <TRANSFORMRESULT> (recognizer: IfMatchesFluent<ROUTABLE, TRANSFORMRESULT>): IfMatchesFluent<ROUTABLE, TRANSFORMRESULT>;

//     and <TRANSFORMRESULT> (arg) {
//         const recognizer = typeof(arg) === 'function'
//             ? arg as (value: VALUE) => IfMatchesFluent<ROUTABLE, any>
//             : (value: VALUE) => arg as IfMatchesFluent<ROUTABLE, any>;
//         return new IfMatchesFluent((routable: ROUTABLE) => Router.getNormalizedMatchResult$(matcher, routable)
//             .flatMap(matchResult => Router.isMatch(matchResult)
//                 ? toObservable(recognizer(matchResult.value))
//                     .flatMap(_ifMatches => Router.getNormalizedMatchResult$(_ifMatches.matcher, routable)
//                         .map(_matchResult => Router.isMatch(_matchResult)
//                             ? _ifMatches instanceof IfTrueFluent
//                                 ? matchResult
//                                 : {
//                                     value: _matchResult.value,
//                                     score: Router.combineScore(matchResult.score, _matchResult.score)
//                                 }
//                             : _matchResult
//                         )
//                     )
//                 : Observable.of(matchResult)
//             )
//         );
//     }

//     thenDo(
//         thenHandler: (routable: ROUTABLE, value: VALUE) => Observableable<any>,
//         score?: number
//     ) {
//         return this.thenTry((_routable, value) => Router.do(routable => thenHandler(routable, value), score));
//     }

//     thenTry(router: Router<ROUTABLE>): IfMatchesThen<ROUTABLE, VALUE>;

//     thenTry(getRouter: (routable: ROUTABLE, value: VALUE) => Router<ROUTABLE>): IfMatchesThen<ROUTABLE, VALUE>;

//     thenTry(arg: Router<ROUTABLE> | ((routable: ROUTABLE, value: VALUE) => Router<ROUTABLE>)) {
//         return new IfMatchesThen(this.matcher, typeof arg === 'function'
//             ? arg
//             : (routable, value) => arg
//         );
//     }
// }

// export class IfTrueFluent <ROUTABLE> extends IfMatchesFluent<ROUTABLE, boolean> {
//     constructor(
//         predicate: Predicate<ROUTABLE>
//     ) {
//         super(Router.predicateToMatcher(predicate));
//     }
// }
