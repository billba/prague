"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var rxjs_1 = require("rxjs");
function toObservable(t) {
    if (t instanceof rxjs_1.Observable)
        return t.take(1);
    if (t instanceof Promise)
        return rxjs_1.Observable.fromPromise(t);
    return rxjs_1.Observable.of(t);
}
exports.toObservable = toObservable;
var routeDoError = new Error('route is not a doRoute or noRoute, cannot do()');
var Route = /** @class */ (function () {
    function Route() {
    }
    Route.prototype.do$ = function () {
        throw routeDoError;
    };
    Route.prototype.do = function () {
        return this.do$().toPromise();
    };
    Route.prototype.type$ = function () {
        var _this = this;
        return new rxjs_1.Observable(function (observer) {
            if (_this instanceof NoRoute)
                observer.next('no');
            if (_this instanceof DoRoute)
                observer.next('do');
            if (_this instanceof MatchRoute)
                observer.next('match');
            if (_this instanceof TemplateRoute)
                observer.next('template');
            if (_this instanceof MultipleRoute)
                observer.next('multiple');
            if (_this instanceof ScoredRoute)
                observer.next('scored');
            observer.next('route');
            observer.next('default');
            observer.complete();
        });
    };
    return Route;
}());
exports.Route = Route;
var ScoredRoute = /** @class */ (function (_super) {
    __extends(ScoredRoute, _super);
    function ScoredRoute(score) {
        var _this = _super.call(this) || this;
        _this.score = ScoredRoute.normalizedScore(score);
        return _this;
    }
    ScoredRoute.normalizedScore = function (score) {
        return score != null && score >= 0 && score < 1
            ? score
            : 1;
    };
    ScoredRoute.combinedScore = function (score, otherScore) {
        return score * otherScore;
    };
    ScoredRoute.prototype.cloneWithScore = function (score) {
        score = ScoredRoute.normalizedScore(score);
        return score === this.score
            ? this
            : Object.assign(Object.create(this.constructor.prototype), this, { score: score });
    };
    ScoredRoute.prototype.cloneWithCombinedScore = function (score) {
        return this.cloneWithScore(ScoredRoute.combinedScore(this.score, ScoredRoute.normalizedScore(score)));
    };
    return ScoredRoute;
}(Route));
exports.ScoredRoute = ScoredRoute;
var TemplateRoute = /** @class */ (function (_super) {
    __extends(TemplateRoute, _super);
    function TemplateRoute(action, args) {
        var rest = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            rest[_i - 2] = arguments[_i];
        }
        var _this = _super.call(this, rest.length === 1 && typeof rest[0] === 'number'
            ? rest[0]
            : rest.length === 2 && typeof rest[1] === 'number'
                ? rest[1]
                : undefined) || this;
        _this.action = action;
        _this.args = args;
        if (rest.length >= 1 && typeof rest[0] !== 'number')
            _this.source = rest[0];
        return _this;
    }
    return TemplateRoute;
}(ScoredRoute));
exports.TemplateRoute = TemplateRoute;
var templateError = new Error('action not present in mapActionToRouter');
var Templates = /** @class */ (function () {
    function Templates(mapTemplateToAction) {
        this.mapTemplateToAction = mapTemplateToAction;
    }
    Templates.prototype.route = function (action, args) {
        var rest = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            rest[_i - 2] = arguments[_i];
        }
        return new (TemplateRoute.bind.apply(TemplateRoute, [void 0, action, args].concat(rest)))();
    };
    Templates.prototype.router = function (action, args) {
        var _this = this;
        var rest = [];
        for (var _i = 2; _i < arguments.length; _i++) {
            rest[_i - 2] = arguments[_i];
        }
        return Router.from(function () { return _this.route.apply(_this, [action, args].concat(rest)); });
    };
    Templates.prototype.mapToDo = function (route, context) {
        var action = this.mapTemplateToAction(context)[route.action];
        return action
            ? new DoRoute(function () { return action(route.args); })
            : route;
    };
    return Templates;
}());
exports.Templates = Templates;
var MultipleRoute = /** @class */ (function (_super) {
    __extends(MultipleRoute, _super);
    function MultipleRoute(routes) {
        var _this = _super.call(this) || this;
        _this.routes = routes;
        return _this;
    }
    return MultipleRoute;
}(Route));
exports.MultipleRoute = MultipleRoute;
var DoRoute = /** @class */ (function (_super) {
    __extends(DoRoute, _super);
    function DoRoute(action) {
        var _this = _super.call(this) || this;
        _this.do$ = function () { return rxjs_1.Observable
            .of(action)
            .flatMap(function (action) { return toObservable(action()); })
            .mapTo(true); };
        return _this;
    }
    return DoRoute;
}(Route));
exports.DoRoute = DoRoute;
function _do(action) {
    return Router.from(function (arg) { return new DoRoute(function () { return action(arg); }); });
}
exports._do = _do;
exports.do = _do;
var MatchRoute = /** @class */ (function (_super) {
    __extends(MatchRoute, _super);
    function MatchRoute(value, score) {
        var _this = _super.call(this, score) || this;
        _this.value = value;
        return _this;
    }
    return MatchRoute;
}(ScoredRoute));
exports.MatchRoute = MatchRoute;
var NoRoute = /** @class */ (function (_super) {
    __extends(NoRoute, _super);
    function NoRoute(reason, value) {
        if (reason === void 0) { reason = NoRoute.defaultReason; }
        var _this = _super.call(this) || this;
        _this.reason = reason;
        _this.value = value;
        _this.do$ = NoRoute.do$;
        return _this;
    }
    NoRoute.defaultGetRoute$ = function () {
        return rxjs_1.Observable.of(NoRoute.default);
    };
    NoRoute.defaultReason = "none";
    NoRoute.do$ = function () { return rxjs_1.Observable.of(false); };
    NoRoute.default = new NoRoute();
    return NoRoute;
}(Route));
exports.NoRoute = NoRoute;
function _no(reason, value) {
    return Router.from(function () { return new NoRoute(reason, value); });
}
exports.no = _no;
var routerNotFunctionError = new Error('router must be a function');
var Router = /** @class */ (function () {
    function Router(router) {
        if (router == null)
            this.route$ = NoRoute.defaultGetRoute$;
        else if (router instanceof Router)
            this.route$ = router.route$;
        else if (typeof router === 'function')
            this.route$ = function (arg) { return rxjs_1.Observable
                .of(router)
                .map(function (router) { return router(arg); })
                .flatMap(toObservable)
                .flatMap(function (result) { return result instanceof Router
                ? result.route$()
                : rxjs_1.Observable.of(Router.normalizedRoute(result)); }); };
        else
            throw routerNotFunctionError;
    }
    Router.prototype.route = function (arg) {
        return this.route$(arg).toPromise();
    };
    Router.normalizedRoute = function (route) {
        if (route == null)
            return NoRoute.default;
        if (route instanceof Route)
            return route;
        if (route.reason)
            return new NoRoute(route.reason);
        if (route.value)
            return new MatchRoute(route.value);
        return new MatchRoute(route);
    };
    ;
    Router.from = function (router) {
        if (router == null)
            return noRouter;
        if (router instanceof Router)
            return router;
        return new Router(router);
    };
    Router.prototype.do$ = function (arg) {
        return this
            .route$(arg)
            .flatMap(function (route) { return route.do$(); });
    };
    Router.prototype.do = function (arg) {
        return this
            .do$(arg)
            .toPromise();
    };
    Router.prototype.map = function (mapRoute) {
        var _this = this;
        return new Router(function (arg) { return _this
            .route$(arg)
            .flatMap(Router.from(mapRoute).route$); });
    };
    Router.prototype.mapByType = function (mapTypeToRouter) {
        return this.map(function (route) { return route
            .type$()
            .map(function (type) { return mapTypeToRouter[type]; })
            .filter(function (router) { return !!router; })
            .take(1)
            .flatMap(function (router) { return Router.from(router).route$(route); })
            .defaultIfEmpty(route); });
    };
    Router.prototype.mapTemplate = function (templates, context) {
        return this.mapByType({
            template: function (route) { return templates.mapToDo(route, context); }
        });
    };
    Router.prototype.mapMultiple = function (router) {
        return this.mapByType({
            multiple: router
        });
    };
    Router.prototype.tap = function (fn) {
        return this.map(function (route) { return toObservable(fn(route)).mapTo(route); });
    };
    Router.prototype.default = function (router) {
        return this.mapByType({
            no: router
        });
    };
    Router.prototype.beforeDo = function (action) {
        return this
            .tap(exports.doable)
            .mapByType({
            do: _do(function (route) { return toObservable(action())
                .flatMap(function (_) { return route.do$(); }); })
        });
    };
    Router.prototype.afterDo = function (action) {
        return this
            .tap(exports.doable)
            .mapByType({
            do: _do(function (route) { return route
                .do$()
                .flatMap(function (_) { return toObservable(action()); }); })
        });
    };
    return Router;
}());
exports.Router = Router;
var noRouter = new Router(NoRoute.defaultGetRoute$);
var firstError = new Error("first routers can only return TemplateRoute, DoRoute, and NoRoute");
function first() {
    var routers = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        routers[_i] = arguments[_i];
    }
    return Router.from(function () { return rxjs_1.Observable
        .from(routers)
        // we put concatMap here because it forces everything after it to execute serially
        .concatMap(function (router) { return Router
        .from(router)
        .route$(); })
        .filter(function (route) {
        if (route instanceof TemplateRoute || route instanceof DoRoute)
            return true;
        if (route instanceof NoRoute)
            return false;
        throw firstError;
    })
        .take(1) // so that we don't keep going through routers after we find one that matches
        .defaultIfEmpty(NoRoute.default); });
}
exports.first = first;
var bestError = new Error('best routers can only return TemplateRoute and NoRoute');
function best() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var tolerance;
    var routers;
    if (typeof args[0] === 'number') {
        tolerance = args[0], routers = args.slice(1);
    }
    else {
        tolerance = 0;
        routers = args;
    }
    return Router.from(function () { return rxjs_1.Observable
        .from(routers)
        .flatMap(function (router) { return Router
        .from(router)
        .route$(); })
        .flatMap(function (route) {
        if (route instanceof NoRoute)
            return rxjs_1.Observable.empty();
        if (route instanceof TemplateRoute)
            return rxjs_1.Observable.of(route);
        if (route instanceof MultipleRoute)
            return rxjs_1.Observable.from(route.routes);
        throw bestError;
    })
        .toArray()
        .flatMap(function (routes) { return rxjs_1.Observable
        .from(routes.sort(function (a, b) { return b.score - a.score; }))
        .takeWhile(function (route) { return route.score + tolerance >= routes[0].score; })
        .toArray()
        .map(function (routes) {
        if (routes.length === 0)
            return NoRoute.default;
        if (routes.length === 1)
            return routes[0];
        return new MultipleRoute(routes);
    }); }); });
}
exports.best = best;
function noop(action) {
    return Router
        .from()
        .tap(action);
}
exports.noop = noop;
var mapRouteIdentity = function (route) { return route; };
var getMatchError = new Error("match's matchRouter should only return MatchRoute or NoRoute");
function match(getMatch, mapMatchRoute, mapNoRoute) {
    return Router
        .from(getMatch)
        .mapByType({
        match: mapMatchRoute,
        no: mapNoRoute || mapRouteIdentity,
        default: function () {
            throw getMatchError;
        }
    });
}
exports.match = match;
// _if is a special case of match
// value of MatchRoute must be true or false
// if value is false, NoRoute is instead returned
var ifPredicateError = new Error("predicate must have value of true or false");
function _if(predicate, mapMatchRoute, mapNoRoute) {
    return match(Router
        .from(predicate)
        .mapByType({
        match: function (route) {
            if (route.value === true)
                return route;
            if (route.value === false)
                return NoRoute.default;
            throw ifPredicateError;
        }
    }), mapMatchRoute, mapNoRoute);
}
exports._if = _if;
exports.if = _if;
var doError = new Error("this router must only return DoRoute or NoRoute");
exports.doable = function (route) {
    if (!(route instanceof DoRoute) && !(route instanceof NoRoute))
        throw doError;
};
function _switch(getKey, mapKeyToRouter) {
    return match(getKey, function (match) { return mapKeyToRouter[match.value]; });
}
exports._switch = _switch;
exports.switch = _switch;
//# sourceMappingURL=prague.js.map