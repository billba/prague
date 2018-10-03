import { tube, Scored, tap, toPromise } from './prague';

/**
 * A reference to a function to potentially execute at a later time
 **/

export class ActionReference {

    args: any[];

    /**
     * Create an ActionReference
     * @param name The name of the function
     * @param args The arguments to the function
     */

    constructor (
        public name: string,
        ...args: any[]
    ) {
        this.args = args;
    }
}

export type Actions = Record<string, Function>;

type Args <F extends Actions> = {
    [P in keyof F]:
        F[P] extends (...args: infer ARGS) => any ? ARGS :
        F[P] extends { (...args: infer ARGS): any } ? ARGS :
        never;
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

/**
 * A collection of functions to be referenced for potential later execution
 */

export class ActionReferences <
    CONTEXTARGS extends any[],
    ACTIONS extends Actions,
> {
    reference = {} as Stubs<ACTIONS>;
    scoredReference = {} as ScoredStubs<ACTIONS>;

    /**
     * Create an ActionReferences
     * @param getActions a function which takes zero or more arguments and returns a dictionary of functions 
     */

    constructor (
        private getActions: (...contextargs: CONTEXTARGS) => ACTIONS,
    ) {
        for (const name of Object.keys(getActions(...new Array(getActions.length) as CONTEXTARGS))) {
            this.reference[name] = (...args) => new ActionReference(name, ...args);
            this.scoredReference[name] = (score, ...args) => Scored.from(new ActionReference(name, ...args), score);
            }
    }

    /**
     * Creates a new transform which runs the function referenced by an ActionReference
     * @param contextArgs the arguments to pass to the getActions function passed to the constructor
     * @returns A new transform
     */

    doAction <
        RESULT
    > (
        ...contextArgs: CONTEXTARGS
    ) {
        return (result: RESULT) => {
            if (!(result instanceof ActionReference))
                return Promise.resolve(null);

            const action = this.getActions(...contextArgs)[result.name];

            if (!action)
                throw `unknown action ${result.name}`;

            return toPromise(action(...result.args));
        };
    }

    /**
     * Wraps a function in a new transform which runs the function and runs the function reference if it's an ActionReference
     * @param transform the function whose result may be a function to run
     * @param contextArgs the arguments to pass to the getActions function passed to the constructor
     * @returns A new transform
     */

    run <
        ARGS extends any[],
    > (
        transform: (...args: ARGS) => any,
        ...contextArgs: CONTEXTARGS
    ) {
        return tube(
            transform,
            tap(this.doAction(...contextArgs)),
        );
    }
}
