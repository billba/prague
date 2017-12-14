import { konsole, Router, Matcher, Observableable, toObservable, Predicate, Handler, GetRoute$ } from 'prague';
import { Observable } from 'rxjs';

export * from 'prague';

class FluentRouter <ROUTABLE> extends Router<ROUTABLE> {
    constructor(_getRoute$: GetRoute$<ROUTABLE>) {
        super(_getRoute$);
    }

    static do <ROUTABLE> (
        handler: Handler<ROUTABLE>,
        score?: number
    ) {
        return new FluentRouter<ROUTABLE>(Router.getRouteDo$(handler, score));
    }
    
    static no (reason?: string) {
        return new FluentRouter<any>(Router.getRouteNo$(reason));
    }

    static noop <ROUTABLE> (handler: Handler<ROUTABLE>) {
        return new FluentRouter<ROUTABLE>(Router.getRouteNoop$(handler));
    }

    route$ (routable: ROUTABLE) {
        return Router.route$(routable, this);
    }

    route (routable: ROUTABLE) {
        return Router.route$(routable, this)
            .toPromise();
    }

    beforeDo (handler: Handler<ROUTABLE>) {
        return new FluentRouter(Router.getRouteBefore$(handler, this));
    }

    afterDo (handler: Handler<ROUTABLE>) {
        return new FluentRouter(Router.getRouteAfter$(handler, this));
    }

    defaultDo (handler: (routable: ROUTABLE, reason: string) => Observableable<any>) {
        return this.defaultTry((_routable, reason) => FluentRouter.do(routable => handler(routable, reason)));
    }

    defaultTry (getRouter: (routable: ROUTABLE, reason: string) => Router<ROUTABLE>): FluentRouter<ROUTABLE>;
    defaultTry (router: Router<ROUTABLE>): FluentRouter<ROUTABLE>;
    defaultTry (arg) {
        return new FluentRouter<ROUTABLE>(Router.getRouteDefault$(this, typeof(arg) === 'function'
            ? arg
            : (routable, reason) => arg
        ));
    }
}

export { FluentRouter as Router }
