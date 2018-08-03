import { Observable } from 'rxjs';
export declare type Observableable<T> = T | Observable<T> | Promise<T>;
export declare const toObservable: <T>(t: Observableable<T>) => Observable<T>;
export interface ValidatorResult<V> {
    value?: V;
    reason?: string;
}
export declare abstract class Route<VALUE = any> {
    do$(): Observable<boolean>;
    do(): Promise<boolean>;
    type$(): Observable<string>;
}
export declare abstract class Scored<VALUE = any> extends Route<VALUE> {
    score: number;
    constructor(score?: number);
    static normalizedScore(score?: number): number;
    static combinedScore(score: number, otherScore: number): number;
    cloneWithScore(score?: number): this;
    cloneWithCombinedScore(score?: number): this;
}
export declare type NamedActionSource = string | object;
interface NamedActionOptions<NAME = string> {
    name: NAME;
    source?: NamedActionSource;
    score?: number;
}
export declare class NamedAction extends Scored {
    name: string;
    source?: NamedActionSource;
    args: any[];
    constructor(name: string, ...args: any[]);
    constructor(options: NamedActionOptions, ...args: any[]);
}
export declare type Action<ARGS extends any[], RESULT = any> = (...args: ARGS) => Observableable<RESULT>;
export declare type Actions = Record<string, Action<any[]>>;
export declare type Args<F extends Actions> = {
    [P in keyof F]: F[P] extends (...args: infer ARGS) => Observableable<any> ? ARGS : never;
};
export declare class NamedActions<ACTIONS extends Actions, CONTEXTARGS extends any[], SOURCE extends NamedActionSource = string> {
    actions: (...contextargs: CONTEXTARGS) => ACTIONS;
    constructor(actions: (...contextargs: CONTEXTARGS) => ACTIONS);
    route<NAME extends keyof ACTIONS>(name: NAME, ...args: Args<ACTIONS>[NAME]): NamedAction;
    route<NAME extends keyof ACTIONS>(options: NamedActionOptions<NAME>, ...args: Args<ACTIONS>[NAME]): NamedAction;
    router<NAME extends keyof ACTIONS>(name: NAME, ...args: Args<ACTIONS>[NAME]): Router<[]>;
    router<NAME extends keyof ACTIONS>(options: NamedActionOptions<NAME>, ...args: Args<ACTIONS>[NAME]): Router<[]>;
    mapToDo(route: NamedAction, ...contextargs: CONTEXTARGS): NamedAction | Do;
}
export declare class Multiple extends Route {
    routes: NamedAction[];
    constructor(routes: NamedAction[]);
}
export declare class Do extends Route<any> {
    private action;
    constructor(action: Action<[]>);
    do$(): Observable<boolean>;
}
declare function _do<ARGS extends any[]>(action: Action<ARGS>): Router<ARGS, Do>;
export { _do as do };
export declare class Match<VALUE = any> extends Scored<VALUE> {
    value: VALUE;
    constructor(value: VALUE, score?: number);
}
export declare class No<VALUE = any> extends Route<VALUE> {
    reason: string;
    value?: VALUE | undefined;
    static defaultReason: string;
    constructor(reason?: string, value?: VALUE | undefined);
    do$(): Observable<boolean>;
    static default: No<any>;
    static defaultGetRoute$(): Observable<No<any>>;
}
declare function _no<VALUE>(reason?: string, value?: VALUE): Router<[], No<VALUE>>;
export { _no as no };
export declare type GetRoute<ARGS extends any[], VALUE = any> = Action<ARGS, Route<VALUE> | VALUE>;
export declare type AnyRouter<ARGS extends any[], VALUE = any> = Router<ARGS, VALUE> | GetRoute<ARGS, VALUE> | Action<ARGS, Router<[], VALUE>>;
export declare class Router<ARGS extends any[], VALUE = any> {
    route$: (...args: ARGS) => Observable<Route<VALUE>>;
    route(...args: ARGS): Promise<Route<VALUE>>;
    constructor(router?: AnyRouter<ARGS, VALUE>);
    private static normalizedRoute;
    static from(router?: null): Router<[], No>;
    static from<ARGS extends any[], VALUE>(router: AnyRouter<ARGS, VALUE>): Router<ARGS, VALUE>;
    do$(...args: ARGS): Observable<boolean>;
    do(...args: ARGS): Promise<boolean>;
    map(mapRoute: AnyRouter<[Route<VALUE>]>): Router<ARGS, any>;
    mapByType(mapTypeToRouter: Partial<MapTypeToRouter<VALUE>>): Router<ARGS, any>;
    mapNamedActions<ACTIONS extends Actions, CONTEXTARGS extends any[]>(actions: NamedActions<ACTIONS, CONTEXTARGS>, ...contextArgs: CONTEXTARGS): Router<ARGS, any>;
    mapMultiple(router: AnyRouter<[Multiple]>): Router<ARGS, any>;
    tap<VALUE>(fn: Action<[Route<VALUE>]>): Router<ARGS>;
    tap(fn: Action<[]>): Router<ARGS>;
    default(router: AnyRouter<[No]>): Router<ARGS, any>;
    beforeDo(action: Action<[]>): Router<ARGS, any>;
    afterDo(action: Action<[]>): Router<ARGS, any>;
}
export declare function first<ARGS extends any[]>(...routers: (AnyRouter<ARGS> | AnyRouter<[]>)[]): Router<ARGS, any>;
export declare function best<ARGS extends any[]>(tolerance: number, ...routers: (AnyRouter<ARGS> | AnyRouter<[]>)[]): Router<ARGS>;
export declare function best<ARGS extends any[]>(...routers: (AnyRouter<ARGS> | AnyRouter<[]>)[]): Router<ARGS>;
export declare function noop(action: Action<[]>): Router<[], any>;
export interface MapTypeToRouteClass<VALUE> {
    route: Route<VALUE>;
    scored: Scored<VALUE>;
    do: Do;
    match: Match<VALUE>;
    namedAction: NamedAction;
    multiple: Multiple;
    no: No<VALUE>;
    default: Route;
}
export declare type RouteTypes<VALUE> = keyof MapTypeToRouteClass<VALUE>;
export declare type MapTypeToRouter<VALUE> = {
    [P in RouteTypes<VALUE>]: AnyRouter<[MapTypeToRouteClass<VALUE>[P]]>;
};
export declare function match<ARGS extends any[], VALUE>(getMatch: AnyRouter<ARGS, VALUE>, mapMatchRoute: AnyRouter<[Match<VALUE>]>, mapNoRoute?: AnyRouter<[No<VALUE>]>): Router<ARGS>;
export declare function _if<ARGS extends any[]>(predicate: AnyRouter<ARGS, boolean>, mapMatchRoute: AnyRouter<[Match<boolean>]>, mapNoRoute?: AnyRouter<[No<boolean>]>): Router<ARGS>;
export { _if as if };
export declare const doable: <VALUE>(route: Route<VALUE>) => void;
