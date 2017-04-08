import { Observable } from 'rxjs';
import { Recognizer, Handler, Rule, rule } from './Intent';
import { Message } from 'botframework-directlinejs';

interface LuisResult {
    results: [{
        intent: string,
        entities: any,
        threshold: number,
    }]
}

const callLuis = (model: string): Observable<LuisResult> => Observable.of({
    results: [{
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
    }]
}).delay(3000);

// match a specific LUIS intent if it's above a given threshold
export const luisIntent = <S>(
    model: string,
    intent: string,
    handler: Handler<S>,
    threshold = .50
): Rule<S> => {
    return {
        recognizers: [(state: S, message: Message) => callLuis(model)
            .flatMap(luisResult => Observable.from(luisResult.results))
            .filter(result => result.intent === intent && result.threshold >= threshold)
            .map(result => result.entities)
        ],
        handler
    };
}
