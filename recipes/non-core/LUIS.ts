import { Observable } from 'rxjs';
import { ITextMatch } from './Text';
import { konsole } from './Konsole';
import { Router, RouterOrHandler, toObservable, toFilteredObservable, toRouter, Matcher } from './Router';
import 'isomorphic-fetch';

export interface LuisIntent {
    intent: string;
    score: number;
}

export interface LuisEntity {
    entity: string;
    type: string;
    startIndex: number;
    endIndex: number;
    score: number;
}

export interface LuisResponse {
    query: string;
    topScoringIntent?: LuisIntent;
    intents?: LuisIntent[];
    entities?: LuisEntity[];
}

export interface ILuisMatch {
    score: number,
    intents?: LuisIntent[],
    entities?: LuisEntity[],
    entity: (type: string) => LuisEntity[],
    entityValues: (type: string) => string[]    
}

const entityFields = (entities: LuisEntity[]): Partial<ILuisMatch> => ({
    entities: entities,
    entity: (type: string) => entities
        .filter(entity => entity.type === type),
    entityValues: (type: string) => entities
        .filter(entity => entity.type === type)
        .map(entity => entity.entity)
})                

export class LuisModel {
    private cache: {
        [utterance: string]: ILuisMatch;
    } = {};
    private scoreThreshold = 0.5;
    private fetcher: (utterance: string) => Promise<LuisResponse>;

    constructor(id: string, key: string, scoreThreshold?: number);
    constructor(fetcher: (utterance: string) => Promise<LuisResponse>, scoreThreshold?: number);
    constructor(... args) {
        this.fetcher = typeof args[0] === 'function'
            ? args[0]
            : (utterance: string) =>
                fetch(`https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/${args[0]}?subscription-key=${args[1]}&q=${utterance}`)
                    .then<LuisResponse>(response => response.json());

        if (typeof args[args.length - 1] === 'number')
            this.scoreThreshold = args[args.length - 1];
    }

    public query(utterance: string): Observable<ILuisMatch> {
        konsole.log("Luis.query", utterance, this.cache);
        const luisMatch = this.cache[utterance];
        if (luisMatch)
            return Observable.of(luisMatch)
                .do(_ => konsole.log("Luis.query: found match from cache"));

        return Observable.fromPromise(this.fetcher(utterance))
            .do(luisResponse => konsole.log("Luis.query: response", luisResponse))
            .flatMap(luisResponse =>
                toObservable<LuisIntent[]>(luisResponse.intents)
                    .map(intents => intents.filter(luisIntent => luisIntent.score >= this.scoreThreshold))
                    .map(intents => ({
                        ... entityFields(luisResponse.entities),
                        intents,
                    } as ILuisMatch))
            )
            .do(luisMatch => {
                this.cache[utterance] = luisMatch;
            });
    }

    public matchIntent <M extends ITextMatch> (intent: string): Matcher<M, M & ILuisMatch> {
        return (m) => this.query(m.text)
            .flatMap(luisMatch =>
                toFilteredObservable(luisMatch.intents.find(i => i.intent === intent))
                    .map(luisIntent => ({
                        ... m as any,
                        ... luisMatch,
                        score: luisIntent.score
                    } as M & ILuisMatch))
            )
    }

    // IMPORTANT: the order of rules is not important - the router matching the *highest-ranked intent* will be executed

    best <M extends ITextMatch> (
        routersOrHandlers: {
            [intent: string] : RouterOrHandler<M & ILuisMatch>;
        }
    ): Router<M> {
        return {
            getRoute: (m) => {
                return toObservable(this.query(m.text))
                    .flatMap(luisMatch =>
                        Observable.from(luisMatch.intents)
                            .flatMap(
                                luisIntent =>
                                    toFilteredObservable(routersOrHandlers[luisIntent.intent])
                                        .flatMap(routerOrHandler =>
                                            toRouter(routerOrHandler).getRoute({
                                                ... m as any,
                                                ... luisMatch,
                                                score: luisIntent.score,
                                            })
                                        ),
                                1
                            )
                            .take(1) // stop with first intent that appears in the rules
                    )
            }
        };
    }

}
