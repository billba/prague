import { Result } from './prague';

export class Sourced <
    RESULT extends Result = Result,
> extends Result {

    constructor(
        public result: RESULT,
        public source: any,
    ) {
        super();
    }

    static unwrap <
        RESULT extends Result = Result,
    >(
        result: Sourced<RESULT> | RESULT,
    ) {
        return result instanceof Sourced
            ? result.result
            : result;
    }
}
