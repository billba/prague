import { Result, transformResult, pipe, doAction } from './prague';

export class ActionReference extends Result {

    args: any[];

    constructor (
        public name: string,
        ...args: any[]
    ) {
        super();
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

export class ActionReferences <
    CONTEXTARGS extends any[],
    ACTIONS extends Actions,
> {
    reference = {} as Stubs<ACTIONS>;

    constructor (
        private actions: (...contextargs: CONTEXTARGS) => ACTIONS,
    ) {
        Object
            .keys(actions(...new Array(actions.length) as CONTEXTARGS))
            .forEach(name => {
                this.reference[name] = (...args) => new ActionReference(name, ...args);
            });
    }

    referenceToAction (
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
            this.referenceToAction(...contextArgs),
            doAction,
        );
    }
}
