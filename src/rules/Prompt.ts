import { IRule, Observizeable, RuleResult, BaseRule, Matcher, Handler, Match, observize, combineMatchers } from '../Rules';
import { Observable } from 'rxjs';
import { ITextMatch } from '../recipes/Text';

export interface Prompt<M> {
    rule: IRule<M>,
    replyWithPrompt: Handler<M>;
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
                prompt.rule.tryMatch(match)
                .map(ruleResult => ({
                    ... ruleResult,
                    action: () => {
                        this.setPromptKey(match, undefined);
                        return ruleResult.action();
                    }
                }))
            );
    }

    replyWithPrompt(promptKey: string): Handler<M> {
        return match => {
            console.log("prompts.replyWithPrompt", match);
            this.setPromptKey(match, promptKey);
            return observize(this.prompts[promptKey].replyWithPrompt(match));
        }
    }
}

export interface IChatPromptConfirmMatch {
    confirm: boolean,
}

export interface IChatPromptChoiceMatch {
    choice: string,
}

export class TextPrompts<M extends ITextMatch> extends Prompts<M> {

    matchChoice(choices: string[]): Matcher<M, M & IChatPromptChoiceMatch> {
        return match =>
            Observable.of(choices.find(choice => choice.toLowerCase() === match.text.toLowerCase()))
            .filter(choice => !!choice)
            .map(choice => ({
                ... match as any, // remove "as any" when TypeScript fixes this bug
                choice
            }));
    }

    matchConfirm(): Matcher<M & IChatPromptChoiceMatch, M & IChatPromptConfirmMatch> {
        return match => ({
            ... match as any, // remove "as any" when TypeScript fixes this bug
            confirm: match.choice === 'Yes' 
        });
    }
}
