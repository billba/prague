import { Result } from './prague';

export class Sourced extends Result {

    constructor(
        public result: Result,
        public source: any,
    ) {
        super();
    }

    static unwrap (
        result: Result,
    ) {
        return result instanceof Sourced
            ? result.result
            : result;
    }
}
