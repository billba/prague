export class Sourced <
    RESULT,
> {
    constructor(
        public result: RESULT,
        public source: any,
    ) {
    }

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
