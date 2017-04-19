import { Observable } from 'rxjs';
import { ITextInput, Action, Rule, bestMatch$, Match, observize, Observizeable } from './Rules';

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
    action: Action<S>;
}

export class LUIS<S extends ITextInput> {
    private cache: LuisCache = {};

    constructor(private id: string, private key: string, private scoreThreshold = 0.5) {
    }

    private testData = {
        "Wagon Wheel": [{
                intent: 'singASong',
                entities: {
                    song: 'Wagon Wheel',
                    genre: undefined,
                },
                score: .95,
            }, {
                intent: 'findSomething',
                entities: {
                    what: 'pub',
                    where: 'London',
                },
                score: .30,
            }, {
                intent: 'bestPerson',
                entities: {
                    name: 'Bill Barnes',
                },
                score: .05,
            }
        ],
        "Pubs in London": [{
                intent: 'findSomething',
                entities: {
                    what: 'pub',
                    where: 'London',
                },
                score: .75,
            }, {
                intent: 'singASong',
                entities: {
                    song: 'Wagon Wheel',
                    genre: undefined,
                },
                score: .60,
            }, {
                intent: 'bestPerson',
                entities: {
                    name: 'Bill Barnes',
                },
                score: .05,
            }
        ]
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

    intent(intent: string, action: Action<S>): LuisRule<S> {
        return {
            intent,
            action
        }
    }

    raw(action: (input: S, luisResponse: LuisResponse) => Observizeable<any>): Rule<S> {
        return (input) =>
            this.call(input.text)
            .map(luisResponse => {
                action: () => action(input, luisResponse)
            });
    }

    // "classic" LUIS usage - for a given model, say what to do with each intent above a given threshold
    // IMPORTANT: the order of rules is not important - the action for the *highest-ranked intent* will be executed
    bestMatch(luisRules: LuisRule<S>[]): Rule<S> {
        return this.raw((input: S, args: LuisResponse) =>
            Observable.from(luisResult.intents)
            .do(intent => console.log("intent", intent))
            .filter(intent => intent.score >= this.scoreThreshold)
            .flatMap(intent =>
                Observable.of(luisRules.find(luisRule => luisRule.intent === intent.intent))
                .filter(luisRule => !!luisRule)
                .do(_ => console.log("filtered intent", intent))
                .map(luisRule => ({
                    score: intent.score,
                    action: () => luisRule.action(input, luisResult.entities)
                } as Match))
            )
            .take(1) // LUIS returns results ordered by best match, we return the first in our list over our threshold
        );
    }



    azureCheckValue = (action: (input: S, args: any) => any) => (input: S) =>
        luis.raw((input: S, args: LuisResponse) => )
    // customMatch(modelName: string, matcher: (input: S, luisMatches: LuisMatch[]) => Observizeable<Match>): Rule<S> {
    //     return (input) =>
    //         this.call(modelName, input.text)
    //         .flatMap(luisResult => observize(action(input, luisResult))
    //             Observable.from(luisResult)
    //             .do(luisMatch => console.log("luisMatch", luisMatch))
    //             .filter(luisMatch => luisMatch.score >= threshold)
    //             .flatMap(luisMatch =>
    //                 Observable.of(luisRules.find(luisRule => luisRule.intent === luisMatch.intent))
    //                 .filter(luisRule => !!luisRule)
    //                 .do(_ => console.log("filtered luisMatch", luisMatch))
    //                 .map(luisRule => ({
    //                     score: luisMatch.score,
    //                     action: () => luisRule.action(input, luisMatch.entities)
    //                 } as Match))
    //             )
    //             .take(1) // LUIS returns results ordered by best match, we return the first in our list over our threshold
    //         );
    // }

}

