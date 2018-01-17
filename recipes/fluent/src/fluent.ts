import { Observable } from 'rxjs';
import { inspect } from 'util';

export type Observableable <T> = T | Observable<T> | Promise<T>;

export function toObservable <T> (t: Observableable<T>) {
    if (t instanceof Observable)
        return t.take(1);
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t);
    return Observable.of(t);
}

const routeDoError = new Error('route is not a doRoute or noRoute, cannot do()');

export abstract class Route <VALUE = any> {
    private _route: undefined; // hack so that TypeScript will do better type checking on Routes

    do$(): Observable<boolean> {
        throw routeDoError;
    }

    do() {
        return this.do$().toPromise();
    }
}

export abstract class ScoredRoute <VALUE = any> extends Route<VALUE> {
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

    static combinedScore(score, otherScore) {
        return score * otherScore
    }

    cloneWithScore(score?: number): this {
        score = ScoredRoute.normalizedScore(score);

        return score === this.score
            ? this
            : Object.assign(Object.create(this.constructor.prototype), this, { score });
    }

    cloneWithCombinedScore(score?: number) {
        return this.cloneWithScore(ScoredRoute.combinedScore(this.score, ScoredRoute.normalizedScore(score)));
    }
}

export type TemplateSource = string | object;

export class TemplateRoute <ACTION = any, ARGS = any> extends ScoredRoute {
    source: TemplateSource;

    constructor (
        action: ACTION,
        args?: ARGS,
        source?: TemplateSource,
        score?: number
    );

    constructor (
        action: ACTION,
        args?: ARGS,
        score?: number
    );
    
    constructor (
        public action: ACTION,
        public args?: ARGS,
        ... rest
    ) {
        super(rest.length === 1 && typeof rest[0] === 'number'
            ? rest[0]
            : rest.length === 2 && typeof rest[1] === 'number'
                ? rest[1]
                : undefined
        );

        if (rest.length >= 1 && typeof rest[0] !== 'number')
            this.source = rest[0];
    }
}

export type TemplateActions <TEMPLATES> = keyof TEMPLATES;

export type MapTemplateToAction <TEMPLATES> = { [P in TemplateActions<TEMPLATES>]: Action<TEMPLATES[P]> }

const templateError = new Error('action not present in mapActionToRouter')

export class Templates <TEMPLATES, CONTEXT = any, SOURCE extends TemplateSource = string> {
    constructor(
        public mapTemplateToAction: (context: CONTEXT) => Partial<MapTemplateToAction<TEMPLATES>>
    ) {
    }

    route <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args?: ARGS,
        source?: SOURCE,
        score?: number
    ): TemplateRoute<ACTION, ARGS>;

    route <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args?: ARGS,
        score?: number
    ): TemplateRoute<ACTION, ARGS>;

    route <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args?: ARGS,
        ... rest
    ) {
        return new TemplateRoute(action, args, ... rest);
    }

    router <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args?: ARGS,
        source?: SOURCE,
        score?: number
    ): Router;

    router <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args?: ARGS,
        score?: number
    ): Router;

    router <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args?: ARGS,
        ... rest
    ) {
        return Router.from(() => this.route(action, args, ... rest));
    }

    mapToDo (
        route: TemplateRoute<keyof TEMPLATES, TEMPLATES[keyof TEMPLATES]>,
        context?: CONTEXT
    ) {
        const action: Action<TEMPLATES[keyof TEMPLATES]> = this.mapTemplateToAction(context)[route.action];
    
        return action
            ? new DoRoute(() => action(route.args))
            : route;
    }
}

export class MultipleRoute extends Route {
    constructor (
        public routes: TemplateRoute[]
    ) {
        super();
    }
}

export type Action <ARG = undefined> = (arg?: ARG) => Observableable<any>;

export class DoRoute extends ScoredRoute<undefined> {
    constructor (
        private action: Action,
        score?: number
    ) {
        super(score);
    }

    do$() {
        return toObservable(this.action()).mapTo(true);
    }
}

export function _do <ARG = undefined> (
    action: Action<ARG>,
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

    do$() {
        return Observable.of(false);
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

export type AnyRouter <ARG = undefined, VALUE = any> = GetRoute<ARG, VALUE> | Router<ARG, VALUE> | ((arg?: ARG) => Observableable<Router<undefined, VALUE>>);

export class Router <ARG = undefined, VALUE = any> {
    route$: (arg?: ARG) => Observable<Route<VALUE>>;

    route (arg?: ARG) {
        return this.route$(arg).toPromise();
    }

    constructor(router?: AnyRouter<ARG, VALUE>) {
        if (router == null)
            this.route$ = NoRoute.router;
        else if (router instanceof Router)
            this.route$ = router.route$;
        else if (typeof router === 'function')
            this.route$ = arg => Observable
                .of(router)
                .map(router => router(arg))
                .flatMap(toObservable)
                .flatMap(result => result instanceof Router
                    ? result.route$()
                    : Observable.of(Router.normalizedRoute(result))
                );
        else
            throw routerNotFunctionError;
    }

    private static normalizedRoute <VALUE> (
        route: Route<VALUE> | VALUE,
    ): Route<VALUE> {
        if (route == null)
            return NoRoute.default;

        if (route instanceof Route)
            return route;

        return new MatchRoute(route);
    };

    static from <ARG, VALUE> (router?: AnyRouter<ARG, VALUE>) {
        return router instanceof Router
            ? router
            : new Router(router);
    }

    do$ (arg?: ARG) {
        return this
            .route$(arg)
            .flatMap(route => route.do$());
    }

    do (arg?: ARG) {
        return this
            .do$(arg)
            .toPromise();
    }

    map (mapRoute: AnyRouter<Route<VALUE>>) {
        return new Router((arg?: ARG) => this
            .route$(arg)
            .flatMap(Router.from(mapRoute).route$)
        );
    }

    mapByType (
        mapTypeToRouter: Partial<MapTypeToRouter<VALUE>>
    ) {
        return this.map(typeRouter(mapTypeToRouter));
    }

    mapTemplate <TEMPLATES, CONTEXT> (
        templates: Templates<TEMPLATES>,
        context?: CONTEXT
    ) {
        return this.mapByType({
            template: route => templates.mapToDo(route, context)
        });
    }

    mapMultiple (
        router: AnyRouter<MultipleRoute>
    ) {
        return this.mapByType({
            multiple: router
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
            .tap(doable)
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
            .tap(doable)
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

const firstError = new Error("first routers can only return ScoredRoute and NoRoute");

export function first (
    ... routers: AnyRouter[]
) {
    return Router.from(() => Observable
        .from(routers)
        // we put concatMap here because it forces everything after it to execute serially
        .concatMap(router => Router
            .from(router)
            .route$()
        )
        .filter(route => {
            if (route instanceof ScoredRoute)
                return true;

            if (route instanceof NoRoute)
                return false;

            throw firstError;
        })
        .take(1) // so that we don't keep going through routers after we find one that matches
        .defaultIfEmpty(NoRoute.default)
    );
}

const bestError = new Error('best routers can only return TemplateRoute and NoRoute');

export function best (
    tolerance: number,
    ... routers: AnyRouter[]
): Router;

export function best (
    ... routers: AnyRouter[]
): Router;

export function best (
    ... args
) {
    let tolerance: number;
    let routers: AnyRouter[];

    if (typeof args[0] === 'number') {
        [tolerance, ... routers] = args;
    } else {
        tolerance = 0;
        routers = args;
    }

    return Router.from(() => Observable
        .from(routers)
        .flatMap(router => Router
            .from(router)
            .route$()
        )
        .flatMap(route => {
            if (route instanceof NoRoute)
                return Observable.empty<TemplateRoute>();

            if (route instanceof TemplateRoute)
                return Observable.of(route);
            
            if (route instanceof MultipleRoute)
                return Observable.from(route.routes);

            throw bestError;
        })
        .toArray()     
        .flatMap(routes => Observable
            .from(routes.sort((a, b) => b.score - a.score))
            .takeWhile(route => route.score + tolerance >= routes[0].score)
            .toArray()
            .map(routes => {
                if (routes.length === 0)
                    return NoRoute.default;

                if (routes.length === 1)
                    return routes[0];

                return new MultipleRoute(routes)
            })
        )
    )
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
    template: TemplateRoute,
    multiple: MultipleRoute,
    no: NoRoute<VALUE>,
    default: Route,
}

export type RouteTypes <VALUE> = keyof MapTypeToRouteClass<VALUE>;

export function* getTypesFromRoute(
    route: Route
) {
    if (route instanceof NoRoute)
        yield 'no';
    
    if (route instanceof DoRoute)
        yield 'do';
    
    if (route instanceof MatchRoute)
        yield 'match';

    if (route instanceof TemplateRoute)
        yield 'template';

    if (route instanceof MultipleRoute)
        yield 'multiple';

    if (route instanceof ScoredRoute)
        yield 'scored';
    
    yield 'route';
    
    yield 'default';
}

export type MapTypeToRouter <VALUE> = { [P in RouteTypes<VALUE>]: AnyRouter<MapTypeToRouteClass<VALUE>[P]> }

export function typeRouter <VALUE> (
    mapTypeToRouter: Partial<MapTypeToRouter<VALUE>>
) {
    return Router.from((route: Route<VALUE>) => {
        for (let type of getTypesFromRoute(route)) {
            const router = mapTypeToRouter[type];
            if (router)
                return Router.from(router).route$(route);
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

export const doable = <VALUE> (route: Route<VALUE>) => {
    if (!(route instanceof DoRoute) && !(route instanceof NoRoute))
        throw doError;
}

export function _switch (
    getKey: GetRoute<undefined, string>,
    mapKeyToRouter: Record<string, GetRoute>
) {
    return ifGet(getKey, match => mapKeyToRouter[match.value]);
}

export { _switch as switch }
