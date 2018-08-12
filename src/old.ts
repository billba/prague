import { Observable, of, from, empty } from 'rxjs';
import { take, map, flatMap, concatMap, mapTo, filter, toArray, takeWhile } from 'rxjs/operators';

export type BaseType <T> =
    T extends Observable<infer BASETYPE> ? BASETYPE :
    T extends Promise<infer BASETYPE> ? BASETYPE :
    T;

export const toObservable = <T> (
    t: Observable<T> | Promise<T> | T,
) =>
    t instanceof Observable
        ? t.pipe(take(1))
        : t instanceof Promise
            ? from(t)
            : of(t);

const routeDoError = new Error('route is not a Do or No, cannot do()');

export abstract class Route {
    do$ (): Observable<boolean> {
        throw routeDoError;
    }

    do () {
        return this
            .do$()
            .toPromise();
    }
}

export abstract class Scored extends Route {

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

export type Actions = Record<string, (...args: any[]) => any>;

export type Args <F extends Actions> = {
    [P in keyof F]: F[P] extends (...args: infer ARGS) => any ? ARGS : never;
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

    // router <
    //     NAME extends keyof ACTIONS,
    // > (
    //     name: NAME,
    //     ...args: Args<ACTIONS>[NAME]
    // ): Router<[], NamedAction>;

    // router <
    //     NAME extends keyof ACTIONS,
    // > (
    //     options: NamedActionOptions<NAME>,
    //     ...args: Args<ACTIONS>[NAME]
    // ): Router<[], NamedAction>;

    // router <
    //     NAME extends keyof ACTIONS,
    // > (
    //     nameOrOptions: NAME | NamedActionOptions<NAME>,
    //     ...args: Args<ACTIONS>[NAME]
    // ) {
    //     return Router.from(() => this.route(nameOrOptions as any, ...args));
    // }

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
        public routes: Route[],
    ) {
        super();
    }
}

export class Do extends Route {
    constructor (
        private action: () => any,
    ) {
        super();
        if (action.length > 0)
            throw "Do action may not have an argument.";
    }

    do$ () {
        return of(this.action).pipe(
            map(action => action()),
            flatMap(toObservable),
            mapTo(true),
        );  
    }
}

export class Match <
    VALUE = any,
> extends Scored {

    constructor(
        public value: VALUE,
        score?: number,
    ) {
        super(score);
    }
}

export class No extends Route {

    static defaultReason = "none";
    
    constructor (
        public reason = No.defaultReason,
    ) {
        super();
    }

    private static false$ = of(false);

    do$ () {
        return No.false$;
    }
}

const _no = new No();

export { _no as no }

const routerNotFunctionError = new Error('router must be a function');

type NormalizedRoute<R> =
    R extends void | null | undefined ? No :
    R extends Route ? R :
    R extends () => any ? Do :
    Match<R>;

type RouterLike <
    ARGS extends any[],
> = void | null | undefined | Router<ARGS> | ((...args: ARGS) => any);

type RouterLikeResult <
    RL
> = 
    RL extends void | null | undefined ? No :
    RL extends Router<any, infer ROUTE> ? ROUTE :
    RL extends (...args: any[]) => infer R ? NormalizedRoute<BaseType<R>> :
    never;

export class Router <
    ARGS extends any[],
    RESULT extends Route = Route,
> {
    route$: (...args: ARGS) => Observable<RESULT>;

    route (...args: ARGS) {
        return this.route$(...args).toPromise();
    }

    private constructor (
        router: (... args: ARGS) => any,
    ) {
        if (typeof router !== 'function')
            throw routerNotFunctionError;

        this.route$ = (...args: ARGS) => of(router).pipe(
            map(router => router(...args)),
            flatMap(toObservable),
            map(result => Router.normalizedRoute(result) as RESULT)
        );
    }

    private static normalizedRoute (
        routeOrValueOrAction: any,
    ) {

        if (routeOrValueOrAction == null)
            return _no;

        if (routeOrValueOrAction instanceof Route)
            return routeOrValueOrAction;

        if (typeof routeOrValueOrAction === 'function')
            return new Do(routeOrValueOrAction);

        return new Match(routeOrValueOrAction);
    };

    private static no = Router.from(() => _no);

    static from (
        router?: null,
    ): Router<[], No>;

    static from <
        ARGS extends any[],
        ROUTE extends Route,
    > (
        router: Router<ARGS, ROUTE>,
    ): Router<ARGS, ROUTE>;

    static from <
        ARGS extends any[],
        R,
    > (
        router: (...args: ARGS) => R,
    ): Router<ARGS, NormalizedRoute<BaseType<R>>>;

    //  static from <
    //     ARGS extends any[],
    //     RL extends RouterLike<ARGS>
    // > (
    //     router: RL,
    // ): Router<ARGS, RouterLikeResult<RL>> {

    //     if (!router)
    //         return Router.from((... args: ARGS) => No.default);

    //     if (router instanceof Router)
    //         return router;

    //     return new Router(router);
    // }

    static from (
        router: any,
    ) {
        if (router == null)
            return Router.no;

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

    // map <
    //     RL extends RouterLike<ARGS>,
    // > (
    //     router: RL,
    // ): RouterLikeResult<RL> {
    //     return {} as RouterLikeResult<RL>;
    //     // return Router.from((...args: ARGS) => this
    //     //     .route$(...args)
    //     //     .pipe(
    //     //         flatMap(route => Router.from(router as Router<[RESULT], Route>).route$(route))
    //     //     )
    //     // );
    // }
    
    map <
        ROUTE extends Route,
    > (
        router: Router<[RESULT], ROUTE>,
    ): Router<ARGS, ROUTE>;

    map <
        R
    > (
        router: (arg: RESULT) => R,
    ): Router<ARGS, NormalizedRoute<BaseType<R>>>

    map (
        router: any,
    ) {
        return Router.from((...args: ARGS) => this
            .route$(...args)
            .pipe(
                flatMap(route => Router.from(router as Router<[RESULT]>).route$(route))
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
        return this.map(route => route instanceof NamedAction
            ? actions.mapToDo(route, ...contextArgs)
            : route
        );
    }

    mapMultiple <
        ROUTE extends Route,
    > (
        router: Router<[RESULT], ROUTE>,
    ): Router<ARGS, ROUTE>;

    mapMultiple <
        R
    > (
        router: (arg: RESULT) => R,
    ): Router<ARGS, NormalizedRoute<BaseType<R>>>;

    mapMultiple (
        router: any,
    ) {
        return this.map(route =>
            route instanceof Multiple ? Router.from(router as Router<[RESULT]>).route$(route) :
            route
        );
    }

    tap (
        fn: (route: RESULT) => any,
    ) {
        return this.map(route => toObservable(fn(route)).pipe(
            mapTo(route)
        ));
    }

    default <
        ROUTE extends Route,
    > (
        router: Router<[RESULT], ROUTE>,
    ): Router<ARGS, ROUTE>;

    default <
        R
    > (
        router: (arg: RESULT) => R,
    ): Router<ARGS, NormalizedRoute<BaseType<R>>>;

    default (
        router: any,
    ) {
        return this.map(route =>
            route instanceof No ? Router.from(router as Router<[RESULT]>).route$(route) :
            route
        );
    }

    beforeDo (
        action: () => any,
    ) {
        return this.map(route =>
            route instanceof Do ? () => toObservable(action()).pipe(
                flatMap(_ => route.do$())
            ) as Observable<any>:
            route
        );
    }

    afterDo (
        action: () => any,
    ) {
        return this.map(route =>
            route instanceof Do ? () => route.do$().pipe(
                flatMap(_ => toObservable(action()))
            ) as Observable<any>:
            route
        );
    }
}

type Or<T> = T[Extract<keyof T, "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9">];

type FirstRouter<
    ROUTERS
> = Router<
    Or<{
        [R in keyof ROUTERS]:
            ROUTERS[R] extends Router<infer A, any> ? A :
            ROUTERS[R] extends (... args: infer A) => any ? A :
            never
    }>,
    Or<{
        [R in keyof ROUTERS]:
            ROUTERS[R] extends Router<any, infer R> ? R :
            ROUTERS[R] extends (... args: any[]) => infer R ? NormalizedRoute<BaseType<R>> :
            never
    }>
>

export function first <
    ROUTERS extends (Router<any, any> | ((... args: any[]) => any))[]
> (
    ...routers: ROUTERS
): FirstRouter<ROUTERS> {
    return Router.from((...args: any[]) =>
        from(routers.map(router => Router.from(router as Router<any, any>))).pipe(
            // we put concatMap here because it forces everything to after it to execute serially
            concatMap((router, i) => router.route$(...args).pipe(
                // ignore every No but the last one
                filter(route => i === routers.length - 1 || !(route instanceof No)),
            )),
            // Stop when we find one that matches
            take(1), 
        )
    );
}

const bestError = new Error('best routers can only return TemplateRoute and NoRoute');

interface BestOptions {
    tolerance?: number;
    disambiguator: Router<Route[]>;
}

const defaultDisambiguator = Router.from(route =>
    route instanceof Multiple ? route.routes[0]
    : route
);

const score = (route?: Route) => route instanceof Scored ? route.score : 1;

export function best <
    ROUTERS extends (Router<any, any> | ((... args: any[]) => any))[]
>  (
    ...routers: ROUTERS
): FirstRouter<ROUTERS>;

export function best <
    ROUTERS extends (Router<any, any> | ((... args: any[]) => any))[]
>  (
    tolerance: number,
    ...routers: ROUTERS
): FirstRouter<ROUTERS>;

export function best (
    ...args: any[]
) {
    let tolerance: number;
    let routers: Router<any>[];

    if (typeof args[0] === 'function') {
        tolerance = 0;
        routers = args;
    } else {
        [tolerance, routers] = args;
    }

    return Router.from((... args: any[]) => from(routers.map(router => Router.from(router))).pipe(
        flatMap(router => router.route$(... args)),
        flatMap(route => 
            route instanceof No ? empty() :
            route instanceof Multiple ? from(route.routes) :
            of(route)
        ),
        toArray(),
        flatMap(routes => from(routes.sort((a, b) => score(b) - score(a))).pipe(
            takeWhile(route => score(route) + tolerance >= score(routes[0])),
            toArray(),
            map(routes =>
                routes.length === 0 ? _no :
                routes.length === 1 ? routes[0] :
                new Multiple(routes)
            ),
        ))
    ))
}

export function noop (
    action: () => any,
) {
    return Router
        .from()
        .tap(action)
}

const getMatchError = new Error("match's matchRouter should only return MatchRoute or NoRoute");

type Noable = void | null | undefined | No;

export function match <
    ARGS extends any[],
    VALUE,
> (
    getMatch: Router<ARGS, No | Match<VALUE>>,
    mapMatchRoute: RouterLike<[Match<VALUE>]>,
    mapNoRoute?: RouterLike<[No]>,
): Router<ARGS>;

export function match <
    ARGS extends any[],
    VALUE,
> (
    getMatch: (... args: ARGS) => Noable | VALUE | Match<VALUE>,
    mapMatchRoute: RouterLike<[Match<VALUE>]>,
    mapNoRoute?: RouterLike<[No]>,
): Router<ARGS>;

export function match <
    ARGS extends any[],
    VALUE,
> (
    getMatch: any,
    mapMatchRoute: RouterLike<[Match<VALUE>]>,
    mapNoRoute?: RouterLike<[No]>,
) {
    const matchRouter = Router.from(mapMatchRoute as Router<[Match<VALUE>]>);
    const noRouter = Router.from(mapNoRoute as Router<[No]>);

    return Router
        .from(getMatch as Router<ARGS, No | Match<VALUE>>)
        .map(route => {
            if (route instanceof Match)
                return matchRouter.route$(route);
            if (route instanceof No)
                return noRouter.route$(route);
            throw getMatchError;
        });
}

// _if is a special case of match
// value of MatchRoute must be true or false
// if value is false, NoRoute is instead returned

const ifPredicateError = new Error("predicate must have value of true or false");

export function _if <
    ARGS extends any[],
> (
    predicate: Router<ARGS, Match<boolean>>,
    mapMatchRoute: RouterLike<[Match<boolean>]>,
    mapNoRoute?: RouterLike<[No]>,
): Router<ARGS>;

export function _if <
    ARGS extends any[],
> (
    predicate: (... args: ARGS) => boolean | Match<boolean>,
    mapMatchRoute: RouterLike<[Match<boolean>]>,
    mapNoRoute?: RouterLike<[No]>,
): Router<ARGS>;

export function _if (
    predicate: any,
    mapMatchRoute: RouterLike<[Match<boolean>]>,
    mapNoRoute?: RouterLike<[No]>,
) {
    return match(
        Router
            .from(predicate)
            .map(route => {
                if (route instanceof Match) {
                    if (route.value === true)
                        return route;

                    if (route.value === false)
                        return _no;

                    throw ifPredicateError;
                }

                return route;
            }),
        mapMatchRoute,
        mapNoRoute
    );
}

export { _if as if }

export * from './util';