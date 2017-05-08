import { Observable } from 'rxjs';

export interface IInputSource<S> {
    input$: Observable<S>;
}

export type Observizeable<T> = T | Observable<T> | Promise<T>

export interface Match {
    score?: number
}

const minMatch = {
    score: Number.MIN_VALUE
}

export interface Recognizer<A extends Match, Z extends Match> {
    (match: A): Observizeable<Z>;
}

export type GenericRecognizer = Recognizer<Match, Match>;

export interface Handler<Z extends Match> {
    (match: Z): Observizeable<any>;
}

export type GenericHandler = Handler<Match>;

export type RecognizerOrHandler = GenericRecognizer | GenericHandler;

export const arrayize = <T>(stuff: T | T[]) => Array.isArray(stuff) ? stuff : [stuff];

export const observize = <T>(t: Observizeable<T>) => {
    if (!t)
        return Observable.empty<T>();
    if (t instanceof Observable)
        return t.filter(i => !!i);
    if (t instanceof Promise)
        return Observable.fromPromise<T>(t).filter(i => !!i);
    return Observable.of(t);
}

export interface Predicate<A extends Match> {
    (match: A): Observizeable<boolean>;
}

export interface Predicates<A extends Match> {
    [name: string]: Predicate<A>
}

const nullHandler = () => console.warn("this is never actually executed");

export class Rule<A extends Match> {
    public recognizers: GenericRecognizer[];
    public handler: GenericHandler;

    constructor(... args: RecognizerOrHandler[]) {
        if (args.length === 0) {
            console.error("rules must at least have a handler");
            return;
        }
        this.recognizers = args.slice(0, args.length - 1) as GenericRecognizer[];
        this.handler = args[args.length - 1] as GenericHandler;
    }

    recognize(match: A): Observable<Match> {
        console.log("trying to match a rule");
        return this.recognizers && this.recognizers.length
            ? Observable.from(this.recognizers)
                .reduce<GenericRecognizer, Observable<Match>>(
                    (prevObservable, currentRecognizer, i) =>
                        prevObservable
                        .flatMap(prevMatch => {
                            console.log(`calling recognizer #${i}`, currentRecognizer);
                            return observize(currentRecognizer(prevMatch)).do(result => console.log("result", result));
                        }),
                    Observable.of(match)
                )
                .flatMap(omatch => omatch)
                .do(m => console.log("match", m))
            : observize(match);
    }

    handle(match: A): Observable<any> {
        return this.recognize(match)
            .do(match => console.log("handle got a recognized rule", match))
            .flatMap(match => {
                return observize(this.handler(match)).do(_ => console.log("handler called!"));
            });
    }

    prepend<PRE extends Match>(recognizer: Recognizer<PRE, A>) {
        return new Rule<PRE>(
            recognizer,
            ... this.recognizers,
            this.handler
        );
    }

    static prepend<PRE, M>(recognizer: Recognizer<PRE, M>, rule: Rule<M>) {
        return rule.prepend(recognizer);
    }

    static first$<M extends Match>(rule$: Observable<Rule<M>>): Rule<M> {
        return new Rule<M>(
            (match: M) => {
                console.log("Rule.first", rule$);
                return rule$
                .flatMap(
                    (rule, i) => {
                        console.log(`Rule.first: trying rule #${i}`);
                        return rule.recognize(match)
                            .do(m => console.log(`Rule.first: rule #${i} succeeded`, m))
                            .map(m => ({
                                ... m,
                                handler: rule.handler
                            }));
                    },
                    1
                )
                .take(1); // so that we don't keep going through rules after we find one that matches
            }, 
            (match: M & { handler: GenericHandler }) => {
                console.log("Rule.first: calling handler");
                return observize(match.handler(match)).do(_ => console.log("Rule.first: returned from handler"));
            }
        );
    }

    static first<S extends Match>(... rules: Rule<S>[]): Rule<S> {
        return Rule.first$(Observable.from(rules)/*.filter(rule => !!rule)*/);
    }

    static filter<S extends Match>(predicate: Predicate<S>, rule: Rule<S>): Rule<S> {
        return rule.prepend((match: S) =>
            observize(predicate(match))
            .map(_ => match)
        );
    }

    // These are left over from the previous API and need to be updated to the latest hotness

    static best$<M extends Match>(rule$: Observable<Rule<M>>): Rule<M> {
        return new Rule<M>(
            (match: M) =>
                rule$
                .do(_ => console.log("Rule.best: trying rule"))
                .flatMap(rule =>
                    rule.recognize(match)
                    .map(match => ({
                        ... match,
                        handler: rule.handler
                    }))
                )
                .reduce<Match>((prev, current) => Math.min(prev.score || 1, 1) > Math.min(current.score || 1, 1) ? prev : current, minMatch)
                .takeWhile(match => match.score && match.score < 1),
            (match: M & { handler: GenericHandler }) =>
                match.handler(match)
        );
    }

    static best<M extends Match>(... rules: Rule<M>[]): Rule<M> {
        return Rule.first$(Observable.from(rules).filter(rule => !!rule));
    }

    static do<M extends Match>(handler: Handler<M>): Rule<M> {
        return new Rule<M>(
            (match: M) =>
                observize(handler(match))
                .map(_ => null),
            nullHandler
        )
    }

    // left over from the previous API and need to be updated to the latest hotness

    // export const everyMatch$ = <S>(rule$: Observable<Rule<S>>, scoreThreshold = 0) => (input) =>
    //     rule$
    //     .do(_ => console.log("everyMatch$: trying rule"))
    //     .flatMap(rule => observize(rule(input)))
    //     .reduce((prev, current) => (current.score || 1) < scoreThreshold ? prev : {
    //         action: prev
    //             ? () => observize(prev.action()).flatMap(_ => observize(current.action()))
    //             : () => current.action()
    //         }
    //     );
}
