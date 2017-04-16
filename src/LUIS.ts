import { Observable } from 'rxjs';
import { ITextInput, Action, Rule } from './Rules';

// a temporary model for LUIS built from my imagination because I was offline at the time

interface LuisMatcher {
    intent: string,
    entities: any,
    threshold: number,
}

interface LuisResponse {
    matchers: LuisMatcher[];
}

interface LuisCache {
    [message: string]: LuisMatcher[];
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
                threshold: .95,
            }, {
                intent: 'findSomething',
                entities: {
                    what: 'pub',
                    where: 'London',
                },
                threshold: .30,
            }, {
                intent: 'bestPerson',
                entities: {
                    name: 'Bill Barnes',
                },
                threshold: .05,
            }
        ],
        "Pubs in London": [{
                intent: 'findSomething',
                entities: {
                    what: 'pub',
                    where: 'London',
                },
                threshold: .75,
            }, {
                intent: 'singASong',
                entities: {
                    song: 'Wagon Wheel',
                    genre: undefined,
                },
                threshold: .60,
            }, {
                intent: 'bestPerson',
                entities: {
                    name: 'Bill Barnes',
                },
                threshold: .05,
            }
        ]
    }

    // a mock because I don't really care about really calling LUIS yet
    private call(modelName: string, utterance: string): Observable<LuisMatcher[]> {
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
    rule(modelName: string, luisRules: LuisRule<S>[], threshold = .50): Rule<S> {
        return {
            matcher: (input) =>
                this.call(modelName, input.text)
                .flatMap(luisResult =>
                    Observable.from(luisResult)
                    .filter(matcher => matcher.threshold >= threshold)
                    .filter(matcher => luisRules.some(luisRule => luisRule.intent === matcher.intent))
                    .take(1) // take the highest ranked intent in our rule list
                ),
            action: (input, args: LuisMatcher) => 
                luisRules.find(luisRule => luisRule.intent === args.intent).action(input, args.entities),
            name: `LUIS: ${modelName}/${luisRules.map(lr => lr.intent).join('+')}`
        };
    }
}

