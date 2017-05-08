import { CardAction, IChatMessageMatch, Activity } from '../recipes/Chat';
import { ITextMatch } from '../recipes/Text';
import { Observizeable, IRule, RuleResult, BaseRule, Matcher, Handler, matchAll, Match, observize, combineMatchers } from '../Rules';
import { Observable } from 'rxjs';

export interface IPromptTextMatch extends ITextMatch {
}

export interface IPromptConfirmMatch {
    confirm: boolean,
}

export interface IPromptChoiceMatch {
    choice: string,
}

export interface Prompt<M> {
    matcher: Matcher<M, any>,
    handler: Handler<any>
    creator: (match: M) => Observizeable<any>;
}

interface PromptMap<M extends ITextMatch & IChatMessageMatch> {
    [promptKey: string]: Prompt<M>;
}

export class Prompts<M extends ITextMatch & IChatMessageMatch> extends BaseRule<M> {
    private prompts: PromptMap<M> = {};

    constructor(
        private getPromptKey: (match: M) => string,
        private setPromptKey: (match: M, promptKey?: string) => void
    ) {
        super();
    }

    add(promptKey: string, prompt: Prompt<M>) {
        if (this.prompts[promptKey]) {
            console.warn(`Prompt key ${promptKey} already exists. Plese use a different key.`);
            return;
        }
        console.log("creating Prompt", promptKey);
        this.prompts[promptKey] = prompt;
    }

    // Prompt Creators
    text(text: string, handler: Handler<M & IPromptTextMatch>) {
        return {
            matcher: matchAll,
            handler,
            creator: (match) =>
                match.reply(text),
        };
    }

    matchChoice(choices: string[]): Matcher<M, M & IPromptChoiceMatch> {
        return (match) =>
            Observable.of(choices.find(choice => choice.toLowerCase() === match.text.toLowerCase()))
            .filter(choice => !!choice)
            .map(choice => ({
                ... match as any, // remove "as any" when TypeScript fixes this bug
                choice
            }));
    }

    private createChoice(text: string, choices: string[]) {
        return (match: M) => {
            match.reply({
                type: 'message',
                from: { id: 'MyBot' },
                text,
                suggestedActions: { actions: choices.map<CardAction>(choice => ({
                    type: 'postBack',
                    title: choice,
                    value: choice
                })) }
            });
        }
    }

    choice(text: string, choices: string[], handler: Handler<M & IPromptChoiceMatch>): Prompt<M> {
        return {
            matcher: this.matchChoice(choices),
            handler,
            creator: this.createChoice(text, choices)
        };
    }

    matchConfirm(): Matcher<M & IPromptChoiceMatch, M & IPromptConfirmMatch> {
        return (match) => ({
            ... match as any, // remove "as any" when TypeScript fixes this bug
            confirm: match.choice === 'Yes' 
        });
    }

    confirm(text: string, handler: Handler<M & IPromptConfirmMatch>): Prompt<M> {
        const choices = ['Yes', 'No'];
        return {
            matcher: combineMatchers(
                this.matchChoice(choices),
                this.matchConfirm()
            ),
            handler,
            creator: this.createChoice(text, choices)
        };
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

    reply(promptKey: string) {
        return (match: M) => {
            console.log("prompts.reply", match);
            this.setPromptKey(match, promptKey);
            return this.prompts[promptKey].creator(match);
        }
    }
}
