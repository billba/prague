import { Observable } from 'rxjs';
import { ITextSession, Handler, Rule } from './Intent';

// a temporary model for LUIS built from my imagination because I was offline at the time

interface LuisMatch {
    intent: string,
    entities: any,
    threshold: number,
}

interface LuisResponse {
    matches: LuisMatch[];
}

interface LuisCache {
    [message: string]: LuisMatch[];
}

interface LuisCredentials {
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

export interface LuisRule<S extends ITextSession> {
    intent: string,
    handler: Handler<S>,
}

export class LUIS<S extends ITextSession> {
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

    intent(intent: string, handler: Handler<S>): LuisRule<S> {
        return {
            intent,
            handler
        }
    }

    // "classic" LUIS usage - for a given model, say what to do with each intent above a given threshold
    // IMPORTANT: the order of rules is not important - the handler for the *highest-ranked intent* will be executed
    rule(modelName: string, luisRules: LuisRule<S>[], threshold = .50): Rule<S> {
        return {
            recognizer: (session) =>
                this.call(modelName, session.text)
                .flatMap(luisResult =>
                    Observable.from(luisResult)
                    .filter(match => match.threshold >= threshold)
                    .filter(match => luisRules.some(luisRule => luisRule.intent === match.intent))
                    .take(1) // take the highest ranked intent in our rule list
                ),
            handler: (session, args: LuisMatch) => 
                luisRules.find(luisRule => luisRule.intent === args.intent).handler(session, args.entities),
            name: `LUIS: ${modelName}/${luisRules.map(lr => lr.intent).join('+')}`
        };
    }
}

