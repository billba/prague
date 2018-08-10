import { Result, from } from './prague';

interface NamedActionOptions <
    NAME = string,
> {
    name: NAME,
    source?: any, 
    score?: number, 
}

export class NamedAction extends Result {

    name: string;
    source?: any;
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

type Stubs<ACTIONS extends Actions> = {
    [P in keyof Args<ACTIONS>]: (...args: Args<ACTIONS>[P]) => NamedAction
}

export class NamedActions <
    ACTIONS extends Actions,
    CONTEXTARGS extends any[],
> {
    for: Stubs<ACTIONS>;

    constructor (
        private actions: (...contextargs: CONTEXTARGS) => ACTIONS,
    ) {
        this.for = Object
            .keys(actions(...new Array<any>(actions.length) as CONTEXTARGS))
            .reduce(
                (stubbedActions, name) => {
                    stubbedActions[name] = (...args: any[]) => new NamedAction(name, ...args);
                    return stubbedActions;
                },
                {} as Stubs<ACTIONS>
            )
    }

    toAction <
        RESULT extends Result | undefined,
    > (
        ...contextargs: CONTEXTARGS
    ) {
        return from((result: RESULT) => {
            if (result instanceof NamedAction) {
                const action = this.actions(...contextargs)[result.name];

                if (action)
                    return () => action(...result.args);
            }

            return result;
        });
    }
}
