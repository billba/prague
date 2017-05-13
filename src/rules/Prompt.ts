import { Observizeable, RuleResult, BaseRule, Matcher, Handler, Match, observize, combineMatchers } from '../Rules';
import { Observable } from 'rxjs';

export interface Prompt<M> {
    matcher: Matcher<M>,
    handler: Handler,
    creator: Handler<M>;
}

interface PromptMap<M> {
    [promptKey: string]: Prompt<M>;
}

export class Prompts<M extends Match> extends BaseRule<M> {
    private prompts: PromptMap<M> = {};

    constructor(
        private getPromptKey: (match: M) => string,
        private setPromptKey: (match: M, promptKey?: string) => void
    ) {
        super();
    }

    add(promptKey: string, prompt: Prompt<M>) {
        if (this.prompts[promptKey]) {
            console.warn(`Prompt key ${promptKey} already exists. Please use a different key.`);
            return;
        }
        console.log("creating Prompt", promptKey);
        this.prompts[promptKey] = prompt;
    }

    tryMatch(match: M): Observable<RuleResult> {
        return Observable.of(this.getPromptKey(match))
            .do(promptKey => console.log("promptKey", promptKey))
            .filter(promptKey => promptKey !== undefined)
            .map(promptKey => this.prompts[promptKey])
            .filter(prompt => prompt !== undefined)
            .flatMap(prompt =>
                observize(prompt.matcher(match))
                .map(m => ({
                    action: () => {
                        this.setPromptKey(match, undefined);
                        return prompt.handler(m);
                    }
                }))
            );
    }

    reply(promptKey: string): Handler<M> {
        return match => {
            console.log("prompts.reply", match);
            this.setPromptKey(match, promptKey);
            return observize(this.prompts[promptKey].creator(match));
        }
    }
}
