import { Observable } from 'rxjs';
import { ITextMatch } from '../recipes/Text';
import { IRule, RuleResult, BaseRule, SimpleRule, Matcher, Handler, Match, Observizeable, observize } from '../Rules';

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
    findEntity: (type: string) => LuisModel.findEntity(entities, type),
    entityValues: (type: string) => LuisModel.entityValues(entities, type),
})                

export class LuisModel<M extends ITextMatch> {
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
                score: .90,
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
        console.log("calling LUIS");
        const response = this.cache[utterance];
        if (response)
            return Observable.of(response).do(_ => console.log("from cache!!"));
        if (this.url === 'testData') {
            const luisResponse = this.testData[utterance];
            if (!luisResponse)
                return Observable.empty();
            return Observable.of(luisResponse)
                .do(luisResponse => console.log("LUIS test data!", luisResponse))
                .do(luisResponse => this.cache[utterance] = luisResponse);
        }
        return Observable.ajax.get(this.url + utterance)
            .do(ajaxResponse => console.log("LUIS response!", ajaxResponse))
            .map(ajaxResponse => ajaxResponse.response as LuisResponse)
            .do(luisResponse => this.cache[utterance] = luisResponse);
    }

    public match: Matcher<M, M & { luisResponse: LuisResponse }> =
        (match) =>
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

    best(... luisRules: LuisRule<M>[]): IRule<M> {
        return new BestMatchingLuisRule((match) => this.match(match), ... luisRules) as IRule<M>;
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

class BestMatchingLuisRule<M extends ITextMatch> extends BaseRule<M> {
    private luisRules: LuisRule<M>[];

    constructor(private matchModel: Matcher<M, M & { luisResponse: LuisResponse }>, ... luisRules: LuisRule<M>[]) {
        super();
        this.luisRules = luisRules;
    }

    tryMatch(match: M): Observable<RuleResult> {
        return observize(this.matchModel(match))
            .flatMap(m =>
                Observable.from(m.luisResponse.intents)
                .flatMap(
                    luisIntent =>
                        Observable.of(this.luisRules.find(luisRule => luisRule.intent === luisIntent.intent))
                        .filter(luisRule => !!luisRule)
                        .map(luisRule => ({
                            score: luisIntent.score,
                            action: () => luisRule.handler({
                                ... m as any, // remove "as any" when TypeScript fixes this bug
                                ... entityFields(m.luisResponse.entities),
                            })
                        })),
                    1
                )
                .take(1) // stop with first intent that appears in the rules
            )
    }
}
