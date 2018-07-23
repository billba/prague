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
exports.toObservable = function (t) {
    return t instanceof rxjs_1.Observable
        ? t.take(1)
        : t instanceof Promise
            ? rxjs_1.Observable.fromPromise(t)
            : rxjs_1.Observable.of(t);
};
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
            if (_this instanceof No)
                observer.next('no');
            if (_this instanceof Do)
                observer.next('do');
            if (_this instanceof Match)
                observer.next('match');
            if (_this instanceof Template)
                observer.next('template');
            if (_this instanceof Multiple)
                observer.next('multiple');
            if (_this instanceof Scored)
                observer.next('scored');
            observer.next('route');
            observer.next('default');
            observer.complete();
        });
    };
    return Route;
}());
exports.Route = Route;
var Scored = /** @class */ (function (_super) {
    __extends(Scored, _super);
    function Scored(score) {
        var _this = _super.call(this) || this;
        _this.score = Scored.normalizedScore(score);
        return _this;
    }
    Scored.normalizedScore = function (score) {
        return score != null && score >= 0 && score < 1
            ? score
            : 1;
    };
    Scored.combinedScore = function (score, otherScore) {
        return score * otherScore;
    };
    Scored.prototype.cloneWithScore = function (score) {
        score = Scored.normalizedScore(score);
        return score === this.score
            ? this
            : Object.assign(Object.create(this.constructor.prototype), this, { score: score });
    };
    Scored.prototype.cloneWithCombinedScore = function (score) {
        return this.cloneWithScore(Scored.combinedScore(this.score, Scored.normalizedScore(score)));
    };
    return Scored;
}(Route));
exports.Scored = Scored;
var Template = /** @class */ (function (_super) {
    __extends(Template, _super);
    function Template(action, args) {
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
    return Template;
}(Scored));
exports.Template = Template;
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
        return new (Template.bind.apply(Template, [void 0, action, args].concat(rest)))();
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
            ? new Do(function () { return action(route.args); })
            : route;
    };
    return Templates;
}());
exports.Templates = Templates;
var Multiple = /** @class */ (function (_super) {
    __extends(Multiple, _super);
    function Multiple(routes) {
        var _this = _super.call(this) || this;
        _this.routes = routes;
        return _this;
    }
    return Multiple;
}(Route));
exports.Multiple = Multiple;
var Do = /** @class */ (function (_super) {
    __extends(Do, _super);
    function Do(action) {
        var _this = _super.call(this) || this;
        _this.action = action;
        return _this;
    }
    Do.prototype.do$ = function () {
        return rxjs_1.Observable
            .of(this.action)
            .flatMap(function (action) { return exports.toObservable(action()); })
            .mapTo(true);
    };
    return Do;
}(Route));
exports.Do = Do;
function _do(action) {
    return Router.from(function (arg) { return new Do(function () { return action(arg); }); });
}
exports._do = _do;
exports.do = _do;
var Match = /** @class */ (function (_super) {
    __extends(Match, _super);
    function Match(value, score) {
        var _this = _super.call(this, score) || this;
        _this.value = value;
        return _this;
    }
    return Match;
}(Scored));
exports.Match = Match;
var false$ = rxjs_1.Observable.of(false);
var No = /** @class */ (function (_super) {
    __extends(No, _super);
    function No(reason, value) {
        if (reason === void 0) { reason = No.defaultReason; }
        var _this = _super.call(this) || this;
        _this.reason = reason;
        _this.value = value;
        return _this;
    }
    No.prototype.do$ = function () {
        return false$;
    };
    No.defaultGetRoute$ = function () {
        return rxjs_1.Observable.of(No.default);
    };
    No.defaultReason = "none";
    No.do$ = function () { return false$; };
    No.default = new No();
    return No;
}(Route));
exports.No = No;
function _no(reason, value) {
    return Router.from(function () { return new No(reason, value); });
}
exports.no = _no;
var routerNotFunctionError = new Error('router must be a function');
var Router = /** @class */ (function () {
    function Router(router) {
        if (router == null)
            this.route$ = No.defaultGetRoute$;
        else if (router instanceof Router)
            this.route$ = router.route$;
        else if (typeof router === 'function')
            this.route$ = function (arg) { return rxjs_1.Observable
                .of(router)
                .map(function (router) { return router(arg); })
                .flatMap(exports.toObservable)
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
            return No.default;
        if (route instanceof Route)
            return route;
        if (route.reason)
            return new No(route.reason);
        if (route.value)
            return new Match(route.value);
        return new Match(route);
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
        return this.map(function (route) { return exports.toObservable(fn(route)).mapTo(route); });
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
            do: _do(function (route) { return exports.toObservable(action())
                .flatMap(function (_) { return route.do$(); }); })
        });
    };
    Router.prototype.afterDo = function (action) {
        return this
            .tap(exports.doable)
            .mapByType({
            do: _do(function (route) { return route
                .do$()
                .flatMap(function (_) { return exports.toObservable(action()); }); })
        });
    };
    return Router;
}());
exports.Router = Router;
var noRouter = new Router(No.defaultGetRoute$);
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
        if (route instanceof Template || route instanceof Do)
            return true;
        if (route instanceof No)
            return false;
        throw firstError;
    })
        .take(1) // so that we don't keep going through routers after we find one that matches
        .defaultIfEmpty(No.default); });
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
        if (route instanceof No)
            return rxjs_1.Observable.empty();
        if (route instanceof Template)
            return rxjs_1.Observable.of(route);
        if (route instanceof Multiple)
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
            return No.default;
        if (routes.length === 1)
            return routes[0];
        return new Multiple(routes);
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
var defaultGetMatchError = function () {
    throw getMatchError;
};
function match(getMatch, mapMatchRoute, mapNoRoute) {
    return Router
        .from(getMatch)
        .mapByType({
        match: mapMatchRoute,
        no: mapNoRoute || mapRouteIdentity,
        default: defaultGetMatchError,
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
                return No.default;
            throw ifPredicateError;
        }
    }), mapMatchRoute, mapNoRoute);
}
exports._if = _if;
exports.if = _if;
var doError = new Error("this router must only return DoRoute or NoRoute");
exports.doable = function (route) {
    if (!(route instanceof Do) && !(route instanceof No))
        throw doError;
};
function _switch(getKey, mapKeyToRouter) {
    return match(getKey, function (match) { return mapKeyToRouter[match.value]; });
}
exports._switch = _switch;
exports.switch = _switch;
//# sourceMappingURL=prague.js.map