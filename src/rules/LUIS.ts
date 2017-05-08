import { Observable } from 'rxjs';
import { ITextMatch } from '../recipes/Text';
import { Rule, Recognizer, Handler, GenericHandler, Match, observize, Observizeable } from '../Rules';

// a temporary model for LUIS built from my imagination because I was offline at the time

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

interface LuisCache {
    [utterance: string]: LuisResponse;
}

export interface ILuisMatch {
    entities: LuisEntity[],
    findEntity: (type: string) => LuisEntity[],
    entityValues: (type: string) => string[]    
}

export interface LuisRule<M extends ITextMatch> {
    intent: string;
    handler: Handler<M & ILuisMatch>;
}

interface TestData {
    [utterance: string]: LuisResponse;
}


const entityFields = (entities: LuisEntity[]): ILuisMatch => ({
    entities: entities,
    findEntity: (type: string) => LUIS.findEntity(entities, type),
    entityValues: (type: string) => LUIS.entityValues(entities, type),
})                

export class LUIS<M extends ITextMatch> {
    private cache: LuisCache = {};
    private url: string;

    constructor(id: string, key: string, private scoreThreshold = 0.5) {
        this.url = 
            id === 'id' && key === 'key' ? 'testData' :
            `https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/${id}?subscription-key=${key}&q=`;
    }

    private testData: TestData = {
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
            : (this.url === 'testData'
                ? Observable.of(this.testData[utterance])
                : Observable.ajax.get(this.url + utterance)
                    .do(ajaxResponse => console.log("LUIS response!", ajaxResponse))
                    .map(ajaxResponse => ajaxResponse.response as LuisResponse)
                )
            .do(luisResponse => this.cache[utterance] = luisResponse)
        )
    }

    public matchModel(): Recognizer<M, M & { luisResponse: LuisResponse }> {
        return (match) =>
            this.call(match.text)
            .filter(luisResponse => luisResponse.topScoringIntent.score >= this.scoreThreshold)
            .map(luisResponse => ({
                ... match as any, // remove "as any" when TypeScript fixes this bug
                luisResponse: {
                    ... luisResponse,
                    intents: (luisResponse.intents || luisResponse.topScoringIntent && [luisResponse.topScoringIntent])
                        .filter(luisIntent => luisIntent.score >= this.scoreThreshold)
                }
            } as M & { luisResponse: LuisResponse}));
    }

    public matchIntent(intent: string): Recognizer<M & { luisResponse: LuisResponse }, M & ILuisMatch> {
        return (match) => 
            Observable.from(match.luisResponse.intents)
            .filter(luisIntent => luisIntent.intent === intent)
            .take(1)
            .filter(luisIntent => luisIntent.score >= this.scoreThreshold)
            .map(luisIntent => ({
                ... match as any, // remove "as any" when TypeScript fixes this bug
                ... entityFields(match.luisResponse.entities),
            }));
    }

    intentRule(intent: string, handler: Handler<M & ILuisMatch>): Rule<M> {
        return new Rule<M>(
            this.matchModel(),
            this.matchIntent(intent),
            handler
        );
    }

    rule(intent: string, handler: Handler<M & ILuisMatch>): LuisRule<M> {
        return ({
            intent,
            handler
        });
    }

    // "classic" LUIS usage - for a given model, say what to do with each intent above a given threshold
    // IMPORTANT: the order of rules is not important - the rule matching the *highest-ranked intent* will be executed
    // Note that:
    //      luis.best(
    //          luis.rule('intent1', handler1),
    //          luis.rule('intent2', handler2)
    //      )
    // is just a more efficient (and concise) version of:
    //      Rule.first(
    //          new Rule(luis.model(), luis.intent('intent1'), handler1)),
    //          new Rule(luis.model(), luis.intent('intent2'), handler2))
    //      )
    // or:
    //      Rule.first(
    //          luis.rule('intent1', handler1),
    //          luis.rule('intent2', handler2)
    //      ).prepend(luis.model())

    best(... luisRules: LuisRule<M>[]): Rule<M> {
        return new Rule<M>(
            this.matchModel(),
            (match: M & { luisResponse : LuisResponse }) => 
                Observable.from(match.luisResponse.intents)
                .flatMap(
                    luisIntent =>
                        Observable.of(luisRules.find(luisRule => luisRule.intent === luisIntent.intent))
                        .filter(luisRule => !!luisRule)
                        .map(luisRule => ({
                            ... match as any, // remove "as any" when TypeScript fixes this bug
                            ... entityFields(match.luisResponse.entities),
                            handler: luisRule.handler
                        } as M & ILuisMatch & { handler: GenericHandler })),
                    1
                )
                .take(1),
            (match: M & { handler: GenericHandler }) =>
                match.handler(match)
        )
    }

    static findEntity(entities: LuisEntity[], type: string) {
        return entities
        .filter(entity => entity.type === type);
    }

    static entityValues(entities: LuisEntity[], type: string) {
        return this.findEntity(entities, type)
        .map(entity => entity.entity);
    }

}

