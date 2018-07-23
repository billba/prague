import { Observable } from 'rxjs';

export type Observableable <T> = T | Observable<T> | Promise<T>;

export const toObservable = <T> (
    t: Observableable<T>,
) =>
    t instanceof Observable
        ? t.take(1)
        : t instanceof Promise
            ? Observable.fromPromise<T>(t)
            : Observable.of(t);

export interface ValidatorResult <V> {
    value?: V;
    reason?: string;
}

const routeDoError = new Error('route is not a doRoute or noRoute, cannot do()');

export abstract class Route <
    VALUE = any
> {
    do$ (): Observable<boolean> {
        throw routeDoError;
    }

    do () {
        return this.do$().toPromise();
    }

    type$ () {
        return new Observable<string>(observer => {
            if (this instanceof No)
                observer.next('no');
            
            if (this instanceof Do)
                observer.next('do');
            
            if (this instanceof Match)
                observer.next('match');

            if (this instanceof Template)
                observer.next('template');

            if (this instanceof Multiple)
                observer.next('multiple');

            if (this instanceof Scored)
                observer.next('scored');
            
            observer.next('route');
            
            observer.next('default');

            observer.complete();
        });
    }

}

export abstract class Scored <
    VALUE = any,
> extends Route<VALUE> {

    score: number;
    
    constructor (
        score?: number,
    ) {
        super();

        this.score = Scored.normalizedScore(score);
    }

    static normalizedScore (
        score?: number,
    ) {
        return score != null && score >= 0 && score < 1
            ? score
            : 1;
    }

    static combinedScore (
        score: number,
        otherScore: number,
    ) {
        return score * otherScore
    }

    cloneWithScore (
        score?: number,
    ): this {

        score = Scored.normalizedScore(score);

        return score === this.score
            ? this
            : Object.assign(Object.create(this.constructor.prototype), this, { score });
    }

    cloneWithCombinedScore (
        score?: number
    ) {

        return this.cloneWithScore(Scored.combinedScore(this.score, Scored.normalizedScore(score)));
    }
}

export type TemplateSource = string | object;

export class Template <
    ACTION = any,
    ARGS = any,
> extends Scored {

    source?: TemplateSource;

    constructor (
        action: ACTION,
        args?: ARGS,
        source?: TemplateSource,
        score?: number,
    );

    constructor (
        action: ACTION,
        args?: ARGS,
        score?: number,
    );
    
    constructor (
        public action: ACTION,
        public args?: ARGS,
        ... rest: any[],
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

export class Templates <
    TEMPLATES,
    CONTEXT = any,
    SOURCE extends TemplateSource = string,
> {

    constructor (
        public mapTemplateToAction: (context: CONTEXT) => Partial<MapTemplateToAction<TEMPLATES>>
    ) {
    }

    route <
        ACTION extends keyof TEMPLATES,
        ARGS extends TEMPLATES[ACTION],
    > (
        action: ACTION,
        args?: ARGS,
        source?: SOURCE,
        score?: number,
    ): Template<ACTION, ARGS>;

    route <
        ACTION extends keyof TEMPLATES,
        ARGS extends TEMPLATES[ACTION],
    > (
        action: ACTION,
        args?: ARGS,
        score?: number,
    ): Template<ACTION, ARGS>;

    route <
        ACTION extends keyof TEMPLATES,
        ARGS extends TEMPLATES[ACTION],
    > (
        action: ACTION,
        args?: ARGS,
        ... rest: any[],
    ) {
        return new Template(action, args, ... rest);
    }

    router <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args?: ARGS,
        source?: SOURCE,
        score?: number,
    ): Router;

    router <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args?: ARGS,
        score?: number,
    ): Router;

    router <ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]> (
        action: ACTION,
        args?: ARGS,
        ... rest: any[],
    ) {
        return Router.from(() => this.route(action, args, ... rest));
    }

    mapToDo (
        route: Template<keyof TEMPLATES, TEMPLATES[keyof TEMPLATES]>,
        context?: CONTEXT,
    ) {
        const action: Action<TEMPLATES[keyof TEMPLATES]> = this.mapTemplateToAction(context)[route.action];
    
        return action
            ? new Do(() => action(route.args))
            : route;
    }
}

export class Multiple extends Route {
    constructor (
        public routes: Template[],
    ) {
        super();
    }
}

export type Action <ARG = undefined> = (arg?: ARG) => Observableable<any>;

export class Do extends Route<undefined> {
    constructor (
        private action: Action
    ) {
        super();
    }

    do$ () {
        return Observable
            .of(this.action)
            .flatMap(action => toObservable(action()))
            .mapTo(true);
    }
}

export function _do <
    ARG = undefined
> (
    action: Action<ARG>,
) { 
    return Router.from((arg: ARG) => new Do(() => action(arg)));
}

export { _do as do }

export class Match <
    VALUE = any,
> extends Scored<VALUE> {

    constructor(
        public value: VALUE,
        score?: number,
    ) {
        super(score);
    }
}

const false$ = Observable.of(false);

export class No <
    VALUE = any,
> extends Route<VALUE> {

    static defaultReason = "none";
    
    constructor (
        public reason = No.defaultReason,
        public value?: VALUE,
    ) {
        super();
    }

    do$ () {
        return false$;
    }

    static do$ = () => false$;

    static default = new No();

    static defaultGetRoute$ () {
        return Observable.of(No.default);
    }
}

function _no <VALUE> (
    reason?: string,
    value?: VALUE,
) {
    return Router.from(() => new No(reason, value));
}

export { _no as no }

export type GetRoute <
    ARG = undefined,
    VALUE = any,
> = (arg?: ARG) => Observableable<Route<VALUE> | VALUE>;

const routerNotFunctionError = new Error('router must be a function');

export type AnyRouter <
    ARG = undefined,
    VALUE = any,
> = GetRoute<ARG, VALUE> | Router<ARG, VALUE> | ((arg?: ARG) => Observableable<Router<undefined, VALUE>>);

export class Router <
    ARG = undefined,
    VALUE = any,
> {
    route$: (arg?: ARG) => Observable<Route<VALUE>>;

    route (arg?: ARG) {
        return this.route$(arg).toPromise();
    }

    constructor (
        router?: AnyRouter<ARG, VALUE>
    ) {

        if (router == null)
            this.route$ = No.defaultGetRoute$;
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
        route: Route<VALUE> | ValidatorResult<VALUE> | VALUE,
    ): Route<VALUE> {

        if (route == null)
            return No.default;

        if (route instanceof Route)
            return route;

        if ((route as any).reason)
            return new No((route as any).reason);

        if ((route as any).value)
            return new Match((route as any).value);

        return new Match(route as VALUE);
    };

    static from <
        ARG,
        VALUE
    > (
        router?: AnyRouter<ARG, VALUE>,
    ): Router<ARG, VALUE> {

        if (router == null)
            return noRouter as Router;

        if (router instanceof Router)
            return router;

        return new Router(router);
    }

    do$ (
        arg?: ARG,
    ) {
        return this
            .route$(arg)
            .flatMap(route => route.do$());
    }

    do (
        arg?: ARG,
    ) {
        return this
            .do$(arg)
            .toPromise();
    }

    map (
        mapRoute: AnyRouter<Route<VALUE>>,
    ) {
        return new Router((arg?: ARG) => this
            .route$(arg)
            .flatMap(Router.from(mapRoute).route$)
        );
    }

    mapByType (
        mapTypeToRouter: Partial<MapTypeToRouter<VALUE>>,
    ) {
        return this.map(route => route
            .type$()
            .map(type => mapTypeToRouter[type] as AnyRouter<Route<VALUE>>)
            .filter(router => !!router)
            .take(1)
            .flatMap(router => Router.from(router).route$(route))
            .defaultIfEmpty(route)
        );
    }

    mapTemplate <
        TEMPLATES,
        CONTEXT,
    > (
        templates: Templates<TEMPLATES>,
        context?: CONTEXT,
    ) {
        return this.mapByType({
            template: route => templates.mapToDo(route, context)
        });
    }

    mapMultiple (
        router: AnyRouter<Multiple>,
    ) {
        return this.mapByType({
            multiple: router
        });
    }

    tap <
        VALUE
    > (
        fn: (route: Route<VALUE>) => Observableable<any>,
    ) {
        return this.map(route => toObservable(fn(route)).mapTo(route));
    }

    default (
        router: AnyRouter<No>,
    ) {
        return this.mapByType({
            no: router
        });
    }

    beforeDo (
        action: Action,
    ) {
        return this
            .tap(doable)
            .mapByType({
                do: _do(route => toObservable(action())
                    .flatMap(_ => route.do$())
                )
            });
    }

    afterDo (
        action: Action,
    ) {
        return this
            .tap(doable)
            .mapByType({
                do: _do(route => route
                    .do$()
                    .flatMap(_ => toObservable(action()))
                )
            });
    }
}

const noRouter = new Router(No.defaultGetRoute$);

const firstError = new Error("first routers can only return TemplateRoute, DoRoute, and NoRoute");

export function first (
    ... routers: AnyRouter[],
) {
    return Router.from(() => Observable
        .from(routers)
        // we put concatMap here because it forces everything after it to execute serially
        .concatMap(router => Router
            .from(router)
            .route$()
        )
        .filter(route => {
            if (route instanceof Template || route instanceof Do)
                return true;

            if (route instanceof No)
                return false;

            throw firstError;
        })
        .take(1) // so that we don't keep going through routers after we find one that matches
        .defaultIfEmpty(No.default)
    );
}

const bestError = new Error('best routers can only return TemplateRoute and NoRoute');

export function best (
    tolerance: number,
    ... routers: AnyRouter[],
): Router;

export function best (
    ... routers: AnyRouter[],
): Router;

export function best (
    ... args: any[],
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
            if (route instanceof No)
                return Observable.empty<Template>();

            if (route instanceof Template)
                return Observable.of(route);
            
            if (route instanceof Multiple)
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
                    return No.default;

                if (routes.length === 1)
                    return routes[0];

                return new Multiple(routes)
            })
        )
    )
}

export function noop (
    action: Action,
) {
    return Router
        .from()
        .tap(action)
}

export interface MapTypeToRouteClass <
    VALUE,
> {
    route: Route<VALUE>,
    scored: Scored<VALUE>,
    do: Do,
    match: Match<VALUE>,
    template: Template,
    multiple: Multiple,
    no: No<VALUE>,
    default: Route,
}

export type RouteTypes <VALUE> = keyof MapTypeToRouteClass<VALUE>;

export type MapTypeToRouter <VALUE> = { [P in RouteTypes<VALUE>]: AnyRouter<MapTypeToRouteClass<VALUE>[P]> }

const mapRouteIdentity = <
    VALUE,
> (
    route: Route<VALUE>,
) => route;

const getMatchError = new Error("match's matchRouter should only return MatchRoute or NoRoute");

const defaultGetMatchError = () => {
    throw getMatchError;
}

export function match <
    VALUE,
> (
    getMatch: AnyRouter<undefined, VALUE>,
    mapMatchRoute: AnyRouter<Match<VALUE>>,
    mapNoRoute?: AnyRouter<No<VALUE>>,
) {
    return Router
        .from(getMatch)
        .mapByType({
            match: mapMatchRoute,
            no: mapNoRoute || mapRouteIdentity,
            default: defaultGetMatchError,
        });
}

// _if is a special case of match
// value of MatchRoute must be true or false
// if value is false, NoRoute is instead returned

const ifPredicateError = new Error("predicate must have value of true or false");

export function _if (
    predicate: AnyRouter<undefined, boolean>,
    mapMatchRoute: AnyRouter<Match<boolean>>,
    mapNoRoute?: AnyRouter<No<boolean>>,
) {
    return match<boolean>(
        Router
            .from(predicate)
            .mapByType({
                match: route => {
                    if (route.value === true)
                        return route;

                    if (route.value === false)
                        return No.default;

                    throw ifPredicateError;
                }
            }),
        mapMatchRoute,
        mapNoRoute
    );
}

export { _if as if }

const doError = new Error("this router must only return DoRoute or NoRoute");

export const doable = <
    VALUE,
> (
    route: Route<VALUE>,
) => {
    if (!(route instanceof Do) && !(route instanceof No))
        throw doError;
}

export function _switch (
    getKey: GetRoute<undefined, string>,
    mapKeyToRouter: Record<string, GetRoute>,
) {
    return match(getKey, match => mapKeyToRouter[match.value]);
}

export { _switch as switch }
