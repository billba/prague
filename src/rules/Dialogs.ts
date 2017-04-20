import { Rule } from '../Rules';

interface Handler<S> {
    (session: S, args: any, next: Function): void;
}

interface Waterfalls<S> {
    [route: string]: Handler<S>[];
}

class DialogBot<S> {
    private waterfalls: Waterfalls<S> = {};

    constructor(
        private getDialogPath: (input: S) => string,
        private setDialogPath: (input: S, dialogPath?: string) => void        
    ) {
    }

    rule(): Rule<S> {
        return (input) => ({
            action: () => {}
        })
    }

    next() {
    }

    dialog(route: string, handlers: Handler<S>[]) {
        this.waterfalls[route] = handlers;
    }
}
