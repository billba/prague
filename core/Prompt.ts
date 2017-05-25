import { IRule, SimpleRule, Observizeable, RuleResult, BaseRule, Matcher, Handler, Match, observize, combineMatchers } from './Rules';
import { Observable } from 'rxjs';
import { ITextMatch } from './Text';

export class Prompts<M extends Match = any> extends BaseRule<M> {
    private rules: {
        [promptKey: string]: IRule<M>;
    } = {};

    constructor(
        private getPromptKey: (match: M) => string,
        private setPromptKey: (match: M, promptKey?: string) => void
    ) {
        super();
    }

    add(promptKey: string, rule: IRule<M>) {
        if (this.rules[promptKey]) {
            console.warn(`Prompt key ${promptKey} already exists. Please use a different key.`);
            return;
        }
        this.rules[promptKey] = rule;
    }

    tryMatch(match: M): Observable<RuleResult> {
        return Observable.of(this.getPromptKey(match))
            .do(promptKey => console.log("promptKey", promptKey))
            .filter(promptKey => promptKey !== undefined)
            .map(promptKey => this.rules[promptKey])
            .filter(rule => rule !== undefined)
            .flatMap(rule =>
                rule.tryMatch(match)
                .map(ruleResult => ({
                    ... ruleResult,
                    action: () => {
                        this.setPromptKey(match, undefined);
                        return ruleResult.action();
                    }
                }))
            );
    }

    setPrompt(match, promptKey: string) {
        this.setPromptKey(match, promptKey);
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

    choice(choices: string[], handler: Handler<M & IChatPromptChoiceMatch>): IRule<M> {
        return new SimpleRule<M>(this.matchChoice(choices), handler);
    }

    confirm(handler: Handler<M & IChatPromptConfirmMatch>): IRule<M> {
        const choices = ['Yes', 'No'];
        return new SimpleRule<M>(
            this.matchChoice(choices),
            this.matchConfirm(),
            handler
        );
    }
}
