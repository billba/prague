import { Observable } from 'rxjs';
import { ITextInput } from '../recipes/Text';
import { Action, Rule, bestMatch$, Match, observize, Observizeable, composeRule } from '../Rules';

// a temporary model for LUIS built from my imagination because I was offline at the time

export interface LuisIntent {
    intent: string;
    score: number;
}

export interface LuisEntity {
    entity: string;
    type: "accountName";
    startIndex: number;
    endIndex: number;
    score: number;
}

export interface LuisResponse {
    query: string;
    topScoringIntent: LuisIntent;
    intents: LuisIntent[];
    entities: LuisEntity[];
}

interface LuisCache {
    [utterance: string]: LuisResponse;
}

export interface LuisRule<S extends ITextInput> {
    intent: string;
    action: (input: S, entities: LuisEntity[]) => Observizeable<any>;
}

export class LUIS<S extends ITextInput> {
    private cache: LuisCache = {};
    private url: string;

    constructor(id: string, key: string, private scoreThreshold = 0.5) {
        this.url = `https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/${id}?subscription-key=${key}&q=`;
    }

    private testData = {
        "Wagon Wheel": {
            query: "Wagon Wheel",
            topScoringIntent: {
                intent: 'singASong',
                score: .95,
            },
            intents: [{
                intent: 'singASong',
                score: .95,
            }, {
                intent: 'findSomething',
                score: .30,
            }, {
                intent: 'bestPerson',
                score: .05
            }],
            entities: [{
                entity: 'Wagon Wheel',
                type: "song",
                startIndex: 0,
                endIndex: 11,
                score: .95
            }, {
                entity: 'Pub',
                type: "what",
                startIndex: 0,
                endIndex: 3,
                score: .89
            }, {
                entity: 'London',
                type: "where",
                startIndex: 0,
                endIndex: 6,
                score: .72
            }]
        },

        "Pubs in London": {
            query: "Pubs in London",
            topScoringIntent: {
                intent: 'findSomething',
                score: .30,
            },
            intents: [{
                intent: 'findSomething',
                score: .90,
            }, {
                intent: 'singASong',
                score: .51,
            }, {
                intent: 'bestPerson',
                score: .05
            }],
            entities: [{
                entity: 'Pub',
                type: "what",
                startIndex: 0,
                endIndex: 3,
                score: .89
            }, {
                entity: 'London',
                type: "where",
                startIndex: 0,
                endIndex: 6,
                score: .72
            }, {
                entity: 'Wagon Wheel',
                type: "song",
                startIndex: 0,
                endIndex: 11,
                score: .35
            }]
        }
    }

    public call(utterance: string): Observable<LuisResponse> {
        return Observable.of(this.cache[utterance])
        .do(_ => console.log("calling LUIS"))
        .flatMap(response => response
            ? Observable.of(response).do(_ => console.log("from cache!!"))
            : Observable.ajax.get(this.url + utterance)
            .do(ajaxResponse => console.log("LUIS response!", ajaxResponse))
            .map(ajaxResponse => ajaxResponse.response as LuisResponse)
            .do(luisResponse => this.cache[utterance] = luisResponse)
        )
    }

    intent(intent: string, action: (input: S, entities: LuisEntity[]) => Observizeable<any>): LuisRule<S> {
        return {
            intent,
            action
        }
    }

    rule(action: (input: S, luisResponse: LuisResponse) => Observizeable<any>): Rule<S> {
        return (input) =>
            this.call(input.text)
            .map(luisResponse => ({
                score: luisResponse.topScoringIntent && luisResponse.topScoringIntent.score,
                action: () => action(input, luisResponse)
            } as Match));
    }

    // "classic" LUIS usage - for a given model, say what to do with each intent above a given threshold
    // IMPORTANT: the order of rules is not important - the action for the *highest-ranked intent* will be executed
    bestMatch(... luisRules: LuisRule<S>[]): Rule<S> {
        return composeRule(this.rule((input, luisResponse) =>
            Observable.from(luisResponse.intents || luisResponse.topScoringIntent && [luisResponse.topScoringIntent])
            .filter(intent => intent.score >= this.scoreThreshold)
            .flatMap(intent =>
                Observable.of(luisRules.find(luisRule => luisRule.intent === intent.intent))
                .filter(luisRule => !!luisRule)
                .map(luisRule => ({
                    score: intent.score,
                    action: () => luisRule.action(input, luisResponse.entities)
                } as Match))
            )
            .take(1) // match the first intent from LUIS for which we supplied rule
        ));
    }

    findEntity(entities: LuisEntity[], type: string) {
        return entities
        .filter(entity => entity.type === type);
    }

    entityValues(entities: LuisEntity[], type: string) {
        return this.findEntity(entities, type)
        .map(entity => entity.entity);
    }

}

