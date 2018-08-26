class Result {
    constructor(score = 1) {
        this.score = score;
    }
}

class Action extends Result {
    constructor(action, score) {
        super(score);
        this.action = action;
    }
}

class Value extends Result {
    constructor(value, score) {
        super(score);
        this.value = value;
    }
}

const normalize = o =>
    o == null ? null :
    o instanceof Result ? o :
    typeof o === 'function' ? new Action(o) :
    new Value(o);

const from = (transform) => transform
    ? (...args) => normalize(transform(...args))
    : () => null;

const first = (...transforms) => (...args) => {
    for (const transform of transforms) {
        const o = from(transform)(...args);
        if (o)
            return o;
    }
    return null;
}

const pipe = (transform, ...transforms) => (...args) => transforms.reduce(
    (r, _transform) => r || from(_transform)(r),
    from(transform)(...args)
);

const combine = (transform, ...transforms) => (...args) => transforms.reduce(
    (r, _transform) => from(_transform)(r),
    from(transform)(...args)
);

const match = (getValue, onValue, onNull) => combine(
    getValue,
    o => {
        if (o === null)
            return onNull ? onNull() : null;
        if (o instanceof Value)
            return onValue(o.value);
        throw "expecting Value or null";
    }
);

class Multiple {
    constructor(results) {
        super();
        this.results = results;
    }
}

const sorted = (...transforms) => (...args) => {
    const results = transforms
        .map(transform => transform(...args))
        .filter(o => o !== null)
        .sort((a, b) => b.score - a.score);

    return results.length === 0 ? null :
        results.length === 1 ? results[0] :
        new Multiple(results);
}
