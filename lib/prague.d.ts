import { Observable } from 'rxjs';
export declare type Observableable<T> = T | Observable<T> | Promise<T>;
export declare function toObservable<T>(t: Observableable<T>): Observable<T>;
export interface ValidatorResult<V> {
    value?: V;
    reason?: string;
}
export declare abstract class Route<VALUE = any> {
    do$(): Observable<boolean>;
    do(): Promise<boolean>;
    type$(): Observable<string>;
}
export declare abstract class ScoredRoute<VALUE = any> extends Route<VALUE> {
    score: number;
    constructor(score?: number);
    static normalizedScore(score?: number): number;
    static combinedScore(score: number, otherScore: number): number;
    cloneWithScore(score?: number): this;
    cloneWithCombinedScore(score?: number): this;
}
export declare type TemplateSource = string | object;
export declare class TemplateRoute<ACTION = any, ARGS = any> extends ScoredRoute {
    action: ACTION;
    args: ARGS;
    source?: TemplateSource;
    constructor(action: ACTION, args?: ARGS, source?: TemplateSource, score?: number);
    constructor(action: ACTION, args?: ARGS, score?: number);
}
export declare type TemplateActions<TEMPLATES> = keyof TEMPLATES;
export declare type MapTemplateToAction<TEMPLATES> = {
    [P in TemplateActions<TEMPLATES>]: Action<TEMPLATES[P]>;
};
export declare class Templates<TEMPLATES, CONTEXT = any, SOURCE extends TemplateSource = string> {
    mapTemplateToAction: (context: CONTEXT) => Partial<MapTemplateToAction<TEMPLATES>>;
    constructor(mapTemplateToAction: (context: CONTEXT) => Partial<MapTemplateToAction<TEMPLATES>>);
    route<ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]>(action: ACTION, args?: ARGS, source?: SOURCE, score?: number): TemplateRoute<ACTION, ARGS>;
    route<ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]>(action: ACTION, args?: ARGS, score?: number): TemplateRoute<ACTION, ARGS>;
    router<ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]>(action: ACTION, args?: ARGS, source?: SOURCE, score?: number): Router;
    router<ACTION extends keyof TEMPLATES, ARGS extends TEMPLATES[ACTION]>(action: ACTION, args?: ARGS, score?: number): Router;
    mapToDo(route: TemplateRoute<keyof TEMPLATES, TEMPLATES[keyof TEMPLATES]>, context?: CONTEXT): TemplateRoute<keyof TEMPLATES, TEMPLATES[keyof TEMPLATES]> | DoRoute;
}
export declare class MultipleRoute extends Route {
    routes: TemplateRoute[];
    constructor(routes: TemplateRoute[]);
}
export declare type Action<ARG = undefined> = (arg?: ARG) => Observableable<any>;
export declare class DoRoute extends Route<undefined> {
    constructor(action: Action);
}
export declare function _do<ARG = undefined>(action: Action<ARG>): Router<ARG, DoRoute>;
export { _do as do };
export declare class MatchRoute<VALUE = any> extends ScoredRoute<VALUE> {
    value: VALUE;
    constructor(value: VALUE, score?: number);
}
export declare class NoRoute<VALUE = any> extends Route<VALUE> {
    reason: string;
    value: VALUE;
    static defaultReason: string;
    constructor(reason?: string, value?: VALUE);
    static do$: () => Observable<boolean>;
    static default: NoRoute<any>;
    static defaultGetRoute$(): Observable<NoRoute<any>>;
}
declare function _no<VALUE>(reason?: string, value?: VALUE): Router<{}, NoRoute<VALUE>>;
export { _no as no };
export declare type GetRoute<ARG = undefined, VALUE = any> = (arg?: ARG) => Observableable<Route<VALUE> | VALUE>;
export declare type AnyRouter<ARG = undefined, VALUE = any> = GetRoute<ARG, VALUE> | Router<ARG, VALUE> | ((arg?: ARG) => Observableable<Router<undefined, VALUE>>);
export declare class Router<ARG = undefined, VALUE = any> {
    route$: (arg?: ARG) => Observable<Route<VALUE>>;
    route(arg?: ARG): Promise<Route<VALUE>>;
    constructor(router?: AnyRouter<ARG, VALUE>);
    private static normalizedRoute<VALUE>(route);
    static from<ARG, VALUE>(router?: AnyRouter<ARG, VALUE>): Router<ARG, VALUE>;
    do$(arg?: ARG): Observable<boolean>;
    do(arg?: ARG): Promise<boolean>;
    map(mapRoute: AnyRouter<Route<VALUE>>): Router<ARG, any>;
    mapByType(mapTypeToRouter: Partial<MapTypeToRouter<VALUE>>): Router<ARG, any>;
    mapTemplate<TEMPLATES, CONTEXT>(templates: Templates<TEMPLATES>, context?: CONTEXT): Router<ARG, any>;
    mapMultiple(router: AnyRouter<MultipleRoute>): Router<ARG, any>;
    tap<VALUE>(fn: (route: Route<VALUE>) => Observableable<any>): Router<ARG, any>;
    default(router: AnyRouter<NoRoute>): Router<ARG, any>;
    beforeDo(action: Action): Router<ARG, any>;
    afterDo(action: Action): Router<ARG, any>;
}
export declare function first(...routers: AnyRouter[]): Router<{}, any>;
export declare function best(tolerance: number, ...routers: AnyRouter[]): Router;
export declare function best(...routers: AnyRouter[]): Router;
export declare function noop(action: Action): Router<{}, any>;
export interface MapTypeToRouteClass<VALUE> {
    route: Route<VALUE>;
    scored: ScoredRoute<VALUE>;
    do: DoRoute;
    match: MatchRoute<VALUE>;
    template: TemplateRoute;
    multiple: MultipleRoute;
    no: NoRoute<VALUE>;
    default: Route;
}
export declare type RouteTypes<VALUE> = keyof MapTypeToRouteClass<VALUE>;
export declare type MapTypeToRouter<VALUE> = {
    [P in RouteTypes<VALUE>]: AnyRouter<MapTypeToRouteClass<VALUE>[P]>;
};
export declare function match<VALUE>(getMatch: AnyRouter<undefined, VALUE>, mapMatchRoute: AnyRouter<MatchRoute<VALUE>>, mapNoRoute?: AnyRouter<NoRoute<VALUE>>): Router<undefined, any>;
export declare function _if(predicate: AnyRouter<undefined, boolean>, mapMatchRoute: AnyRouter<MatchRoute<boolean>>, mapNoRoute?: AnyRouter<NoRoute<boolean>>): Router<undefined, any>;
export { _if as if };
export declare const doable: <VALUE>(route: Route<VALUE>) => void;
export declare function _switch(getKey: GetRoute<undefined, string>, mapKeyToRouter: Record<string, GetRoute>): Router<undefined, any>;
export { _switch as switch };
