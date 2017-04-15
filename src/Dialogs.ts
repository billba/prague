interface DialogHandler<S> {
    (session: S, args: any, next: Function): void;
}

class DialogBot<S> {
    constructor() {
    }

    rule() {
    }

    dialog<S>(name: string, handlers: DialogHandler<S>[]) {
        
    }
}
