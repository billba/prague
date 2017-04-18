import { Observable } from 'rxjs';
import { ITextInput, Action, Rule, bestMatch$, Match } from './Rules';

// a temporary model for LUIS built from my imagination because I was offline at the time

interface LuisMatch {
    intent: string,
    entities: any,
    score: number,
}

interface LuisResponse {
    matchers: LuisMatch[];
}

interface LuisCache {
    [message: string]: LuisMatch[];
}

export interface LuisCredentials {
    name: string,
    id: string,
    key: string,
}

interface LuisModel extends LuisCredentials {
    results: LuisCache
}

interface LuisModels {
    [name: string]: LuisModel
}

export interface LuisRule<S extends ITextInput> {
    intent: string,
    action: Action<S>,
}

export class LUIS<S extends ITextInput> {
    private models: LuisModels = {};

    constructor(... creds: LuisCredentials[]) {
        creds.forEach(cred => this.addModel(cred))
    }

    addModel(creds: LuisCredentials) {
        this.models[creds.name] = {
            ... creds,
            results: {}
        }
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
    private call(modelName: string, utterance: string): Observable<LuisMatch[]> {
        const model = this.models[modelName];
        if (!model) {
            console.error(`no LUIS model with name ${modelName} - provide with constructor or call addModel`)
            return Observable.empty();
        }

        let result = model.results[utterance];
        if (!result) {
            result = this.testData[utterance];
            if (!result)
                return Observable.empty();
            model.results[utterance] = result;
        }

        return Observable.of(result);
    }

    intent(intent: string, action: Action<S>): LuisRule<S> {
        return {
            intent,
            action
        }
    }

    // "classic" LUIS usage - for a given model, say what to do with each intent above a given threshold
    // IMPORTANT: the order of rules is not important - the action for the *highest-ranked intent* will be executed
    bestMatch(modelName: string, luisRules: LuisRule<S>[], threshold = .50): Rule<S> {
        return (input) =>
            this.call(modelName, input.text)
            .flatMap(luisResult =>
                Observable.from(luisResult)
                .do(luisMatch => console.log("luisMatch", luisMatch))
                .filter(luisMatch => luisMatch.score >= threshold)
                .flatMap(luisMatch =>
                    Observable.of(luisRules.find(luisRule => luisRule.intent === luisMatch.intent))
                    .filter(luisRule => !!luisRule)
                    .do(_ => console.log("filtered luisMatch", luisMatch))
                    .map(luisRule => ({
                        score: luisMatch.score,
                        action: () => luisRule.action(input, luisMatch.entities)
                    } as Match))
                )
                .take(1) // LUIS returns results ordered by best match, we return the first in our list over our threshold
            );
    }

}

