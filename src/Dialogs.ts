import { Rule } from './Rules';

interface Handler<S> {
    (session: S, args: any, next: Function): void;
}

interface Waterfalls<S> {
    [route: string]: Handler<S>[];
}

class DialogBot<S> {
    private waterfalls: Waterfalls<S> = {};

    constructor() {
    }

    rule(): Rule<S> {
        return {
            matcher: (input) => {},
            action: (input, args) => {},
            name: 'Dialog'
        }
    }

    next() {
    }

    dialog(route: string, handlers: Handler<S>[]) {
        this.waterfalls[route] = handlers;
    }
}
