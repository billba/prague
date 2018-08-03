import { Observable, of, from, empty } from 'rxjs';
import { take, map, flatMap, concatMap, mapTo, filter, defaultIfEmpty, toArray, takeWhile } from 'rxjs/operators';

export type Observableable <T> = T | Observable<T> | Promise<T>;

export const toObservable = <T> (
    t: Observableable<T>,
) =>
    t instanceof Observable
        ? t.pipe(take(1))
        : t instanceof Promise
            ? from(t)
            : of(t);

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
        return this
            .do$()
            .toPromise();
    }

    type$ () {
        return new Observable<string>(observer => {
            if (this instanceof No)
                observer.next('no');
            
            if (this instanceof Do)
                observer.next('do');
            
            if (this instanceof Match)
                observer.next('match');

            if (this instanceof NamedAction)
                observer.next('namedAction');

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

export type NamedActionSource = string | object;

interface NamedActionOptions <
    NAME = string,
> {
    name: NAME,
    source?: NamedActionSource, 
    score?: number, 
}

export class NamedAction extends Scored {

    name: string;
    source?: NamedActionSource;
    args: any[];

    constructor (
        name: string,
        ...args: any[]
    );

    constructor (
        options: NamedActionOptions,
        ...args: any[]
    );
    
    constructor (
        nameOrOptions: string | NamedActionOptions,
        ... args: any[]
    ) {
        super(typeof nameOrOptions === 'string' ? undefined : nameOrOptions.score);

        if (typeof nameOrOptions === 'string') {
            this.name = nameOrOptions;
        } else {
            this.name = nameOrOptions.name;
            this.source = nameOrOptions.source;
        }

        this.args = args;
    }
}

export type Action <ARGS extends any[], RESULT = any> = (...args: ARGS) => Observableable<RESULT>;

export type Actions = Record<string, Action<any[]>>;

export type Args <F extends Actions> = {
    [P in keyof F]: F[P] extends (...args: infer ARGS) => Observableable<any> ? ARGS : never;
}

// const templateError = new Error('action not present in mapActionToRouter')

export class NamedActions <
    ACTIONS extends Actions,
    CONTEXTARGS extends any[],
    SOURCE extends NamedActionSource = string,
> {
    constructor (
        public actions: (...contextargs: CONTEXTARGS) => ACTIONS,
    ) {
    }

    route <
        NAME extends keyof ACTIONS,
    > (
        name: NAME,
        ...args: Args<ACTIONS>[NAME]
    ): NamedAction;

    route <
        NAME extends keyof ACTIONS,
    > (
        options: NamedActionOptions<NAME>,
        ...args: Args<ACTIONS>[NAME]
    ): NamedAction;

    route <
        NAME extends keyof ACTIONS,
    > (
        nameOrOptions: NAME | NamedActionOptions<NAME>,
        ...args: Args<ACTIONS>[NAME]
    ) {
        return new NamedAction(nameOrOptions as any, ...args);
    }

    router <
        NAME extends keyof ACTIONS,
    > (
        name: NAME,
        ...args: Args<ACTIONS>[NAME]
    ): Router<[]>;

    router <
        NAME extends keyof ACTIONS,
    > (
        options: NamedActionOptions<NAME>,
        ...args: Args<ACTIONS>[NAME]
    ): Router<[]>;

    router <
        NAME extends keyof ACTIONS,
    > (
        nameOrOptions: NAME | NamedActionOptions<NAME>,
        ...args: Args<ACTIONS>[NAME]
    ) {
        return Router.from(() => this.route(nameOrOptions as any, ...args));
    }

    mapToDo (
        route: NamedAction,
        ...contextargs: CONTEXTARGS
    ) {
        const action = this.actions(...contextargs)[route.name];
    
        return action
            ? new Do(() => action(...route.args))
            : route;
    }   
}

export class Multiple extends Route {
    constructor (
        public routes: NamedAction[],
    ) {
        super();
    }
}

export class Do extends Route<any> {
    constructor (
        private action: Action<[]>,
    ) {
        super();
        if (action.length > 0)
            throw "Do action may not have an argument.";
    }

    do$ () {
        return of(this.action).pipe(
            map(action => action()),
            flatMap(toObservable),
            mapTo(true)
        );  
    }
}

function _do <
    ARGS extends any[],
> (
    action: Action<ARGS>,
) { 
    if (action.length > 1)
        throw "Actions may only have zero or one argument";

    return Router.from((...args: ARGS) => new Do(() => action(...args)));
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

const false$ = of(false);

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

    static default = new No();

    static defaultGetRoute$ () {
        return of(No.default);
    }
}

function _no <VALUE> (
    reason?: string,
    value?: VALUE,
) {
    return Router.from(() => new No(reason, value));
}

export { _no as no }

const routerNotFunctionError = new Error('router must be a function');

export type AnyRouter <
    ARGS extends any[],
    VALUE = any,
> = Router<ARGS, VALUE> | Action<ARGS, Route<VALUE> | VALUE>;

export class Router <
    ARGS extends any[],
    VALUE = any,
> {
    route$: (...args: ARGS) => Observable<Route<VALUE>>;

    route (...args: ARGS) {
        return this.route$(...args).toPromise();
    }

    constructor (
        router?: AnyRouter<ARGS, VALUE>
    ) {
        if (router == null)
            this.route$ = No.defaultGetRoute$;
        else if (router instanceof Router)
            this.route$ = router.route$;
        else if (typeof router === 'function')
            this.route$ = (...args: ARGS) => of(router).pipe(
                map(router => router(...args)),
                flatMap(toObservable),
                flatMap(result => of(Router.normalizedRoute(result)))
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

    static from (
        router?: null,
    ): Router<[], No>;

    static from <
        ARGS extends any[],
        VALUE,
    > (
        router: AnyRouter<ARGS, VALUE>,
    ): Router<ARGS, VALUE>;
    
    static from <
        ARGS extends any[],
        VALUE,
    > (
        router?: AnyRouter<ARGS, VALUE> | null,
    ) {
        if (router == null)
            return noRouter;

        if (router instanceof Router)
            return router;

        return new Router(router);
    }

    do$ (
        ...args: ARGS
    ) {
        return this
            .route$(...args)
            .pipe(
                flatMap(route => route.do$())
            );
    }

    do (
        ...args: ARGS
    ) {
        return this
            .do$(...args)
            .toPromise();
    }

    map (
        mapRoute: AnyRouter<[Route<VALUE>]>,
    ) {
        return new Router((...args: ARGS) => this
            .route$(...args)
            .pipe(
                flatMap(route => Router.from(mapRoute).route$(route))
            )
        );
    }

    mapByType (
        mapTypeToRouter: Partial<MapTypeToRouter<VALUE>>,
    ) {
        return this.map(route => route
            .type$()
            .pipe(
                map(type => (mapTypeToRouter as Record<string, Router<any>>)[type]), // workaround for TypeScript bug
                filter(router => !!router),
                take(1),
                flatMap(router => Router.from(router).route$(route)),
                defaultIfEmpty(route),
            )
        );
    }

    mapNamedActions <
        ACTIONS extends Actions,
        CONTEXTARGS extends any[],
    > (
        actions: NamedActions<ACTIONS, CONTEXTARGS>,
        ...contextArgs: CONTEXTARGS
    ) {
        return this.mapByType({
            namedAction: route => actions.mapToDo(route, ...contextArgs)
        });
    }

    mapMultiple (
        router: AnyRouter<[Multiple]>,
    ) {
        return this.mapByType({
            multiple: router
        });
    }

    tap <
        VALUE,
    > (
        fn: Action<[Route<VALUE>]>,
    ): Router<ARGS>;

    tap (
        fn: Action<[]>,
    ): Router<ARGS>;

    tap (
        fn: Function,
    ) {
        return this.map(route => toObservable(fn(route)).pipe(
            mapTo(route)
        ));
    }

    default (
        router: AnyRouter<[No]>,
    ) {
        return this.mapByType({
            no: router
        });
    }

    beforeDo (
        action: Action<[]>,
    ) {
        return this
            .tap(doable)
            .mapByType({
                do: _do(route => toObservable(action()).pipe(
                        flatMap(_ => route.do$())
                    )
                )
            });
    }

    afterDo (
        action: Action<[]>,
    ) {
        return this
            .tap(doable)
            .mapByType({
                do: _do(route => route
                    .do$()
                    .pipe(
                        flatMap(_ => toObservable(action()))
                    )
                )
            });
    }
}

const noRouter = new Router(No.defaultGetRoute$);

const firstError = new Error("first routers can only return TemplateRoute, DoRoute, and NoRoute");

export function first <
    ARGS extends any[],
> (
    ...routers: (AnyRouter<ARGS> | AnyRouter<[]>)[]
) {
    return Router.from((...args: ARGS) => from(routers).pipe(
        // we put concatMap here because it forces everything after it to execute serially
        concatMap(router => Router
            .from(router as AnyRouter<any>)
            .route$(...args)
        ),
        filter(route => {
            if (route instanceof NamedAction || route instanceof Do)
                return true;

            if (route instanceof No)
                return false;
            
            throw firstError;
        }),
        take(1), // so that we don't keep going through routers after we find one that matches
        defaultIfEmpty(No.default)
    ));
}

const bestError = new Error('best routers can only return TemplateRoute and NoRoute');

export function best <
    ARGS extends any[],
> (
    tolerance: number,
    ...routers: (AnyRouter<ARGS> | AnyRouter<[]>)[]
): Router<ARGS>;

export function best <
    ARGS extends any[],
> (
    ...routers: (AnyRouter<ARGS> | AnyRouter<[]>)[]
): Router<ARGS>;

export function best (
    ...args: any[]
) {
    let tolerance: number;
    let routers: AnyRouter<any>[];

    if (typeof args[0] === 'number') {
        [tolerance, ...routers] = args;
    } else {
        tolerance = 0;
        routers = args;
    }

    return Router.from((... args: any[]) => from(routers).pipe(
        flatMap(router => Router
            .from(router)
            .route$(... args)
        ),
        flatMap(route => {
            if (route instanceof No)
                return empty();

            if (route instanceof NamedAction)
                return of(route);
            
            if (route instanceof Multiple)
                return from(route.routes);

            throw bestError;
        }),
        toArray(),
        flatMap(routes => from(routes.sort((a, b) => b.score - a.score)).pipe(
            takeWhile(route => route.score + tolerance >= routes[0].score),
            toArray(),
            map(routes => {
                if (routes.length === 0)
                    return No.default;

                if (routes.length === 1)
                    return routes[0];

                return new Multiple(routes);
            })
        ))
    ))
}

export function noop (
    action: Action<[]>,
) {
    return Router
        .from()
        .tap(action as any)
}

export interface MapTypeToRouteClass <
    VALUE,
> {
    route: Route<VALUE>,
    scored: Scored<VALUE>,
    do: Do,
    match: Match<VALUE>,
    namedAction: NamedAction,
    multiple: Multiple,
    no: No<VALUE>,
    default: Route,
}

export type RouteTypes <VALUE> = keyof MapTypeToRouteClass<VALUE>;

export type MapTypeToRouter <VALUE> = { [P in RouteTypes<VALUE>]: AnyRouter<[MapTypeToRouteClass<VALUE>[P]]> }

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
    ARGS extends any[],
    VALUE,
> (
    getMatch: AnyRouter<ARGS, VALUE>,
    mapMatchRoute: AnyRouter<[Match<VALUE>]>,
    mapNoRoute?: AnyRouter<[No<VALUE>]>,
): Router<ARGS> {
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

export function _if <
    ARGS extends any[],
>(
    predicate: AnyRouter<ARGS, boolean>,
    mapMatchRoute: AnyRouter<[Match<boolean>]>,
    mapNoRoute?: AnyRouter<[No<boolean>]>,
): Router<ARGS> {
    return match(
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
