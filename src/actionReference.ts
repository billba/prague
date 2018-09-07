import { Result, transformResult, pipe, doAction, Scored } from './prague';

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

type ScoredStubs<ACTIONS extends Actions> = {
    [P in keyof Args<ACTIONS>]: (
        score: number,
        ...args: Args<ACTIONS>[P]
    ) => Scored<ActionReference>
}

export class ActionReferences <
    CONTEXTARGS extends any[],
    ACTIONS extends Actions,
> {
    reference = {} as Stubs<ACTIONS>;
    scoredReference = {} as ScoredStubs<ACTIONS>;

    constructor (
        private getActions: (...contextargs: CONTEXTARGS) => ACTIONS,
    ) {
        for (const name of Object.keys(getActions(...new Array(getActions.length) as CONTEXTARGS))) {
            this.reference[name] = (...args) => new ActionReference(name, ...args);
            this.scoredReference[name] = (score, ...args) => Scored.from(new ActionReference(name, ...args), score);
            }
    }

    referenceToAction (
        ...contextArgs: CONTEXTARGS
    ) {
        return transformResult(ActionReference, result => {

            const action = this.getActions(...contextArgs)[result.name];

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
