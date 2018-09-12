/**
 * Wraps a result with a source for purposes of later disambiguation
 */

export class Sourced <
    RESULT,
> {
    /**
     * Attempts to create a Scored
     * @param result The result on which the resultant Scored will be based
     * @param score The score (> 0 and <= 1)
     * @returns An instance of Scored, or null if result is null or undefined, or score is 0
     */

    constructor(
        public result: RESULT,
        public source: any,
    ) {
    }

    /**
     * Unwraps a Sourced object
     * @param result The Sourced object to unwrap (or any other result)
     * @returns The Sourced result, or result if its not a Sourced
     */

    static unwrap <
        RESULT,
    >(
        result: Sourced<RESULT> | RESULT,
    ) {
        return result instanceof Sourced
            ? result.result
            : result;
    }
}
