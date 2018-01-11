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

    static is (route: any): route is ScoredRoute {
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

export class TemplateRoute <ACTION, ARGS> extends ScoredRoute {
    constructor (
        public action: ACTION,
        public args: ARGS,
        score?: number
    ) {
        super(score);
    }

    static is <ACTION, ARGS> (route: any): route is TemplateRoute<ACTION, ARGS> {
        return route instanceof TemplateRoute;
    }
}

export type TemplateActions <TEMPLATES> = keyof TEMPLATES;

export type MapTemplateActionToRouter <TEMPLATES> = { [P in TemplateActions<TEMPLATES>]: AnyRouter<TEMPLATES[P]> }

const templateError = new Error('action not present in mapActionToRouter')

export class Templates <TEMPLATES> {
    constructor(
        private mapActionToRouter: Partial<MapTemplateActionToRouter<TEMPLATES>>
    ) {
    }

    route <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args: ARGS
    ) {
        if (!this.mapActionToRouter[action])
            throw templateError;

        return new TemplateRoute(action, args);
    }

    router <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args: ARGS
    ) {
        return () => this.route(action, args);
    }

    map (
        route: TemplateRoute<keyof TEMPLATES, TEMPLATES[keyof TEMPLATES]>
    ) {
        const router: AnyRouter<TEMPLATES[keyof TEMPLATES], any> = this.mapActionToRouter[route.action];
    
        return router
            ? Router
                .from(router)
                .getRoute$(route.args)
            : route;
    }
}

export type Action = () => Observableable<any>;

export class DoRoute extends ScoredRoute<undefined> {
    constructor (
        private action: Action,
        score?: number
    ) {
        super(score);
    }

    static is (route: any): route is DoRoute {
        return route instanceof DoRoute;
    }

    do$() {
        return toObservable(this.action());
    }

    do() {
        return this.do$().toPromise();
    }
}

export function _do <ARG = any> (
    action: (arg?: ARG) => Observableable<any>,
    score?: number
) {
    return Router.from((arg: ARG) => new DoRoute(() => action(arg), score));
}

export { _do as do }

export class MatchRoute <VALUE = any> extends ScoredRoute<VALUE> {
    constructor(
        public value: VALUE,
        score?: number
    ) {
        super(score);
    }

    static is <VALUE = any> (route: any): route is MatchRoute<VALUE> {
        return route instanceof MatchRoute;
    }
}

export function match <VALUE = any> (
    value: VALUE,
    score?: number
) {
    return Router.from(() => new MatchRoute(value, score));
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

    static router = () => NoRoute.default$;

    static is <VALUE = any> (route: any): route is NoRoute<VALUE> {
        return route instanceof NoRoute;
    }
}

function _no <VALUE> (
    reason?: string,
    value?: VALUE
) {
    return Router.from(() => new NoRoute(reason, value));
}

export { _no as no }

export type GetRoute <ARG = undefined, VALUE = any> = (arg?: ARG) => Observableable<Route<VALUE> | VALUE>;

const routerNotFunctionError = new Error('router must be a function');
const route$Error = new Error('route must be a DoRoute or a NoRoute');

export type AnyRouter <ARG = undefined, VALUE = any> = GetRoute<ARG, VALUE> | Router<ARG, VALUE> | ((arg?: ARG) => Observableable<Router<undefined, VALUE>>);

export class Router <ARG = undefined, VALUE = any> {
    getRoute$: (arg?: ARG) => Observable<Route<VALUE>>;

    getRoute (arg?: ARG) {
        return this.getRoute$(arg).toPromise();
    }

    constructor(router?: AnyRouter<ARG, VALUE>) {
        if (router == null)
            this.getRoute$ = NoRoute.router;
        else if (Router.is(router))
            this.getRoute$ = router.getRoute$;
        else if (typeof router !== 'function')
            throw routerNotFunctionError;
        else {
            this.getRoute$ = (arg: ARG) => Observable
                .of(router)
                .map(router => router(arg))
                .flatMap(toObservable)
                .flatMap(result => Router.is(result)
                    ? result.getRoute$()
                    : Observable.of(Router.normalizedRoute(result))
                );
        }
    }

    private static normalizedRoute <VALUE> (
        route: Route<VALUE> | VALUE,
    ): Route<VALUE> {
        if (route == null)
            return NoRoute.default;

        if (Route.is(route))
            return route;

        return new MatchRoute(route);
    };

    static from <ARG, VALUE> (router?: AnyRouter<ARG, VALUE>) {
        return Router.is(router)
            ? router
            : new Router(router);
    }

    static is <ARG, VALUE> (router: any): router is Router<ARG, VALUE> {
        return router instanceof Router;
    }

    route$ (arg?: ARG) {
        return this
            .getRoute$(arg)
            .flatMap(route => {
                if (DoRoute.is(route))
                    return route.do$().mapTo(true);
                if (NoRoute.is(route))
                    return Observable.of(false);
                throw route$Error;
            });
    }

    route (arg?: ARG) {
        return this
            .route$(arg)
            .toPromise();
    }

    map (mapRoute: AnyRouter<Route<VALUE>>) {
        return new Router((arg?: ARG) => this
            .getRoute$(arg)
            .flatMap(Router.from(mapRoute).getRoute$)
        );
    }

    mapByType (
        mapTypeToRouter: Partial<MapTypeToRouter<VALUE>>
    ) {
        return this.map(typeRouter(mapTypeToRouter));
    }

    mapTemplate <TEMPLATES> (
        templates: Templates<TEMPLATES>
    ) {
        return this.mapByType({
            template: route => templates.map(route)
        });
    }

    tap <VALUE> (fn: (route: Route<VALUE>) => Observableable<any>) {
        return this.map(route => toObservable(fn(route)).mapTo(route));
    }

    default (
        router: AnyRouter<NoRoute>
    ) {
        return this.mapByType({
            no: router
        });
    }

    beforeDo(
        action: Action
    ) {
        return this
            .map(filterForDoRoute)
            .mapByType({
                do: route => new DoRoute(
                    () => toObservable(action())
                        .flatMap(_ => route.do$()),
                    route.score
                )
        });
    }

    afterDo(
        action: Action
    ) {
        return this
            .map(filterForDoRoute)
            .mapByType({
                do: route => new DoRoute(
                    () => route
                        .do$()
                        .flatMap(_ => toObservable(action())),
                    route.score
                )
        });
    }
}

const strictlyFilterError = new Error("route isn't DoRoute or NoRoute");

function strictlyFilterScored(route: Route): route is ScoredRoute {
    if (ScoredRoute.is(route))
        return true;

    if (NoRoute.is(route))
        return false;

    throw strictlyFilterError;
}

export function first <VALUE> (
    ... routers: AnyRouter<undefined, VALUE>[]
) {
    return Router.from(() => Observable
        .from(routers)
        // we put concatMap here because it forces everything after it to execute serially
        .concatMap(router => Router
            .from(router)
            .getRoute$()
        )
        .filter(strictlyFilterScored)
        .take(1) // so that we don't keep going through routers after we find one that matches
        .defaultIfEmpty(NoRoute.default)
    );
}

const minRouteError = new Error("minRoute.action should never be called");

const minRoute = new DoRoute(
    () => {
        throw minRouteError;
    },
    0
);

export function best  <VALUE = any> (
    ... routers: AnyRouter<VALUE> []
) {
    return Router.from(() => new Observable<Route>(observer => {
        let bestRoute: ScoredRoute = minRoute;

        const subscription = Observable.from(routers)
            // we put concatMap here because it forces everything after it to execute serially
            .concatMap(router => Router
                .from(router)
                .getRoute$()
            )
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
    }));
}

export function noop (
    action: Action
) {
    return Router
    .from()
        .tap(action)
}

export interface MapTypeToRouteClass <VALUE> {
    route: Route<VALUE>,
    scored: ScoredRoute<VALUE>,
    do: DoRoute,
    match: MatchRoute<VALUE>,
    template: TemplateRoute<any, any>,
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

    if (TemplateRoute.is(route))
        yield 'template';

    if (ScoredRoute.is(route))
        yield 'scored';
    
    if (Route.is(route))
        yield 'route';
    
    yield 'default';
}

export type MapTypeToRouter <VALUE> = { [P in RouteTypes<VALUE>]: AnyRouter<MapTypeToRouteClass<VALUE>[P]> }

function typeRouter <VALUE> (
    mapTypeToRouter: Partial<MapTypeToRouter<VALUE>>
) {
    return Router.from((route: Route<VALUE>) => {
        for (let type of getTypesFromRoute(route)) {
            const router = mapTypeToRouter[type];
            if (router)
                return Router.from(router).getRoute$(route);
        }

        return route;
    })
}

const mapRouteIdentity = <VALUE> (route: Route<VALUE>) => route;

const getMatchError = new Error("ifGet's matchRouter should only return MatchRoute or NoRoute");

export function ifGet <VALUE> (
    getMatch: AnyRouter<undefined, VALUE>,
    mapMatchRoute: AnyRouter<MatchRoute<VALUE>>,
    mapNoRoute?: AnyRouter<NoRoute<VALUE>>
) {
    return Router
        .from(getMatch)
        .mapByType({
            match: mapMatchRoute,
            no: mapNoRoute || mapRouteIdentity,
            default: () => {
                throw getMatchError;
            }
        });
}

// _if is a special case of ifGet
// value of MatchRoute must be true or false
// if value is false, NoRoute is instead returned

const ifPredicateError = new Error("predicate must have value of true or false");

export function _if (
    predicate: AnyRouter<undefined, boolean>,
    mapMatchRoute: AnyRouter<MatchRoute<boolean>>,
    mapNoRoute?: AnyRouter<NoRoute<boolean>>
) {
    return ifGet<boolean>(
        Router
            .from(predicate)
            .mapByType({
                match: route => {
                    if (route.value === true)
                        return route;

                    if (route.value === false)
                        return NoRoute.default;

                    throw ifPredicateError;
                }
            }),
        mapMatchRoute,
        mapNoRoute
    );
}

export { _if as if }

const doError = new Error("this router must only return DoRoute or NoRoute");

export const filterForDoRoute = <VALUE> (route: Route<VALUE>) => {
    if (DoRoute.is(route) || NoRoute.is<VALUE>(route))
        return route;

    throw doError;
}

export function _switch (
    getKey: GetRoute<undefined, string>,
    mapKeyToRouter: Record<string, GetRoute>
) {
    return ifGet(getKey, match => mapKeyToRouter[match.value]);
}

export { _switch as switch }
