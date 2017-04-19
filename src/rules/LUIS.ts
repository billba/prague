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
    action: (input: S, args: LuisEntity[]) => Observizeable<any>;
}

export class LUIS<S extends ITextInput> {
    private cache: LuisCache = {};

    constructor(private id: string, private key: string, private scoreThreshold = 0.5) {
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

    // a mock because I don't really care about really calling LUIS yet
    private call(utterance: string): Observable<LuisResponse> {
        let response = this.cache[utterance];
        if (!response) {
            response = this.testData[utterance]; // this emulates the call
            if (!response)
                return Observable.empty();
            this.cache[utterance] = response;
        }

        return Observable.of(response);
    }

    intent(intent: string, action: (input: S, args: LuisEntity[]) => Observizeable<any>): LuisRule<S> {
        return {
            intent,
            action
        }
    }

    rule(action: (input: S, luisResponse: LuisResponse) => Observizeable<any>): Rule<S> {
        return (input) =>
            this.call(input.text)
            .map(luisResponse => ({
                score: luisResponse.topScoringIntent.score,
                action: () => action(input, luisResponse)
            } as Match));
    }

    // "classic" LUIS usage - for a given model, say what to do with each intent above a given threshold
    // IMPORTANT: the order of rules is not important - the action for the *highest-ranked intent* will be executed
    bestMatch(... luisRules: LuisRule<S>[]): Rule<S> {
        return composeRule(this.rule((input, luisResponse) =>
            Observable.from(luisResponse.intents)
            .do(intent => console.log("intent", intent))
            .filter(intent => intent.score >= this.scoreThreshold)
            .flatMap(intent =>
                Observable.of(luisRules.find(luisRule => luisRule.intent === intent.intent))
                .filter(luisRule => !!luisRule)
                .do(_ => console.log("filtered intent", intent))
                .map(luisRule => ({
                    score: intent.score,
                    action: () => luisRule.action(input, luisResponse.entities)
                } as Match))
            )
            .take(1) // LUIS returns results ordered by best match, we return the first in our list over our threshold
        ));
    }

    findEntity(entities: LuisEntity[], type: string) {
        return entities.find(entity => entity.type === type);
    }

    entityValue(entities: LuisEntity[], type: string) {
        const entity = this.findEntity(entities, type);
        return entity && entity.entity;
    }

}

