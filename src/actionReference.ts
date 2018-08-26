import { Result, transformResult, pipe, doAction } from './prague';

interface ActionReferenceOptions {
    source?: any, 
    score?: number, 
}

interface ActionReferenceOptionsWithName <
    NAME = string,
> extends ActionReferenceOptions {
    name: NAME,
}

export class ActionReference extends Result {

    name: string;
    source?: any;
    args: any[];

    constructor (
        name: string,
        ...args: any[]
    );

    constructor (
        options: ActionReferenceOptionsWithName,
        ...args: any[]
    );
    
    constructor (
        nameOrOptions: string | ActionReferenceOptionsWithName,
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

export type Actions = Record<string, Function>;

type Args <F extends Actions> = {
    [P in keyof F]: F[P] extends (...args: infer ARGS) => any ? ARGS : never;
}

type Stubs<ACTIONS extends Actions> = {
    [P in keyof Args<ACTIONS>]: (
        ...args: Args<ACTIONS>[P]
    ) => ActionReference
}

type StubsWithOptions<ACTIONS extends Actions> = {
    [P in keyof Args<ACTIONS>]: (
        options: ActionReferenceOptions,
        ...args: Args<ACTIONS>[P]
    ) => ActionReference
}

export class ActionReferences <
    CONTEXTARGS extends any[],
    ACTIONS extends Actions,
> {
    reference = {} as Stubs<ACTIONS>;
    referenceWithOptions = {} as StubsWithOptions<ACTIONS>;

    constructor (
        private actions: (...contextargs: CONTEXTARGS) => ACTIONS,
    ) {
        Object
            .keys(actions(...new Array(actions.length) as CONTEXTARGS))
            .forEach(name => {
                this.reference[name] = (...args) => new ActionReference(name, ...args);
                this.referenceWithOptions[name] = (options, ...args) => new ActionReference({
                    name,
                    source: options.source,
                    score: options.score,
                 }, ...args);
            });
    }

    toAction (
        ...contextArgs: CONTEXTARGS
    ) {
        return transformResult(ActionReference, result => {
            const action = this.actions(...contextArgs)[result.name];

            if (!action)
                throw `unknown action ${result.name}`;

            return () => action(...result.args);
        });
    }

    run <
        ARGS extends any[],
        O
    > (
        transform: (...args: ARGS) => O,
        ...contextArgs: CONTEXTARGS
    ) {
        return pipe(
            transform,
            this.toAction(...contextArgs),
            doAction,
        );
    }
}
