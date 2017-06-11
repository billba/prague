import { Match, IRule, BaseRule, RuleResult, Observizeable, observize } from './Rules';
import { Observable } from 'rxjs';
import { konsole } from './Konsole';

export interface DialogInstance {
    name: string;
    instance: string;
}

const rootDialogInstance: DialogInstance = {
    name: '/',
    instance: undefined
}

export interface IDialogMatch {
    currentDialogInstance?: DialogInstance;
    beginDialog(name: string, args?: any): void;
    replaceDialog(name: string, args?: any): void;
    endDialog(): void;
    clearDialogs(): void;
}

export interface IDialogStateMatch<DIALOGSTATE> {
    dialogData: DIALOGSTATE;
}

export interface IDialog<M extends Match & IDialogMatch> {
    invoke(name: string, args?: any): Observable<string>;
    tryMatch(dialogInstance: DialogInstance, match: M): Observable<RuleResult>;
}

class DialogRule<M extends Match & IDialogMatch> extends BaseRule<M> {
    constructor(
        private getActiveDialogInstance: (match: M) => Observizeable<DialogInstance>,
        private setActiveDialogInstance: (match: M, activeDialog?: DialogInstance) => Observizeable<void>,
        private dialogs: {
            [name: string]: IDialog<M>;
        }
    ) {
        super();
    }

    tryMatch(match: M): Observable<RuleResult> {
        return observize(this.getActiveDialogInstance(match))
            .flatMap(activeDialogInstance => {
                const dialog = this.dialogs[activeDialogInstance.name];
                if (!dialog) {
                    console.warn(`A dialog named "${activeDialogInstance.name}" doesn't exist.`);
                    return Observable.empty<RuleResult>();
                }
                return dialog.tryMatch(match.currentDialogInstance, {
                        ... match as any,
                        currentDialogInstance: activeDialogInstance
                    });
            });
    }
}

export class Dialogs<M extends Match & IDialogMatch> {
    private dialogs: {
        [name: string]: IDialog<M>;
    }

    private dialogRule: IRule<M>;

    constructor(
        private getActiveDialogInstance: (match: M) => Observizeable<DialogInstance>,
        private setActiveDialogInstance: (match: M, activeDialog?: DialogInstance) => Observizeable<void>
    ) {
        this.dialogRule = new DialogRule(getActiveDialogInstance, setActiveDialogInstance, this.dialogs);
    }

    matchDialog<N extends Match = any>(match: N, currentDialogInstance: DialogInstance = rootDialogInstance) {
        return match && {
            ... match as any,
            currentDialogInstance,
            // beginDialog: (name: string, args?: any) => this.beginDialog(match, name, args),
            // endDialog:
        } as M & IDialogMatch
    }

    add(name: string, dialog: IDialog<M>) {
        if (this.dialogs[name]) {
            console.warn(`You attempted to add a dialog named "${name}" but a dialog with that name already exists.`);
            return;
        }
        this.dialogs[name] = dialog;
    }

    addRule(name: string, rule: IRule<M>) {
        this.add(name, {
            invoke: () => Observable.of("shared instance"),
            tryMatch: (dialogInstance: DialogInstance, match: M) => rule.tryMatch(match)
        });
    }

    invoke(name: string, match: M, args?: any): Observable<void> {
        return Observable.of(this.dialogs[name])
            .flatMap(dialog => dialog.invoke(args))
            .flatMap(instance => observize(this.setActiveDialogInstance(match, { name, instance })));
    }

    rule<N extends Match = M>(): IRule<N> {
        return this.dialogRule as any as IRule<N>;
    }

}

export class RemoteDialogs<M extends Match & IDialogMatch = any> {
    constructor(
        private matchRemoteDialog: (match: M) => any,
        private handleSuccessfulResponse: (response: any) => any
    ) {
    }

    dialog(remoteUrl: string) {
        return {
            invoke: (name: string, args: any) =>
                Observable.fromPromise(
                        fetch(
                            remoteUrl + "/invoke", {
                                method: 'POST',
                                body: {
                                    name,
                                    args
                                }
                            }
                        )
                        .then(response => response.json())
                    )
                    .flatMap(json => {
                        switch (json.status) {
                            case 'success':
                                return Observable.of(json.instance);
                            case 'error':
                                return Observable.throw(`RemoteDialog.invoke() returned error "${json.error}".`);
                            default:
                                return Observable.throw(`RemoteDialog.invoke() returned unexpected status "${json.status}".`);
                        }
                    }),

            tryMatch: (dialogInstance: DialogInstance, match: M) =>
                Observable.fromPromise(
                        fetch(
                            remoteUrl + "/tryMatch", {
                                method: 'POST',
                                body: {
                                    dialogInstance,
                                    match: this.matchRemoteDialog(match)
                                }
                            }
                        )
                        .then(response => response.json())
                    )
                    .flatMap(json => {
                        switch (json.status) {
                            case 'endWithResult':
                                // end dialog, then fall through
                            case 'result':
                                return observize(this.handleSuccessfulResponse(json.ruleResult));
                            case 'matchless':
                                return Observable.empty();
                            case 'error':
                                return Observable.throw(`RemoteDialog.tryMatch() returned error "${json.error}".`);
                            default:
                                return Observable.throw(`RemoteDialog.tryMatch() returned unexpected status "${json.status}".`);
                        }
                    })
        }
    }
}

export class LocalDialogs<M extends Match & IDialogMatch = any> {
    constructor(
        private newDialogInstance: (name: string, dialogData: any) => Observizeable<string>,
        private getDialogData: (dialogInstance: DialogInstance) => Observizeable<any>,
        private setDialogData: (dialogInstance: DialogInstance, dialogData?: any) => Observizeable<void>
    ) {
    }

    dialog<DIALOGSTATE = undefined, ARGS = any>(
        rule: IRule<M & IDialogStateMatch<DIALOGSTATE>>,
        initialState?: (args: ARGS) => DIALOGSTATE
    ): IDialog<M> {
        return {
            invoke: (name: string, args?: ARGS) =>
                (initialState ? observize(initialState(args)) : Observable.of({}))
                    .flatMap(initialState => observize(this.newDialogInstance(name, initialState))),

            tryMatch: (dialogInstance: DialogInstance, m: M) =>
                observize(this.getDialogData(dialogInstance) as DIALOGSTATE)
                    .flatMap(dialogData =>
                        rule.tryMatch({
                            ... m as any,
                            dialogData
                        })
                        .do(ruleResult => {
                            this.setDialogData(dialogInstance, dialogData);
                        })
                    )
        }
    }
}

// Sample implementation

const dialogStack: {
    [name: string]: DialogInstance;
} = {};

const getActiveDialogInstance = <M extends IDialogMatch>(match: M) => dialogStack[match.currentDialogInstance.name];
const setActiveDialogInstance = <M extends IDialogMatch>(match: M, activeDialogInstance?: DialogInstance) => {
    dialogStack[match.currentDialogInstance.name] = activeDialogInstance;
}

const dialogs = new Dialogs<IGameMatch>(getActiveDialogInstance, setActiveDialogInstance);

const dialogDataStorage: {
    [name: string]: any[];
} = {};

const newDialogInstance = (name: string, dialogData: any = {}) => {
    if (!dialogDataStorage[name])
        dialogDataStorage[name] = [];
    return (dialogDataStorage[name].push(dialogData) - 1).toString();
}

const getDialogData = (dialogInstance: DialogInstance) =>
    dialogDataStorage[dialogInstance.name][dialogInstance.instance];

const setDialogData = (dialogInstance: DialogInstance, dialogData?: any) => {
    dialogDataStorage[dialogInstance.name][dialogInstance.instance] = dialogData;
}

interface GameState {
    num: number;
}

interface IGameMatch extends Match {
    text: string;
    reply: (text: string) => void;
    beginDialog(name: string, args?: any): void;
    replaceDialog(name: string, args?: any): void;
    endDialog(): void;
    clearDialogs(): void;    
}

import { first } from './Rules';
import { re } from './RegExp';

const local = new LocalDialogs<IGameMatch>(newDialogInstance, getDialogData, setDialogData);
const gameDialog = local.dialog<GameState>(
    first(
        dialogs.rule(),
        re(/answer/, m => m.reply(`The answer is ${m.dialogData.num}`)),
    ),
    () => ({ num: Math.random() * 100 })
);

dialogs.add('game', gameDialog);
dialogs.addRule('stocks', first(

));

const appRule: IRule<IGameMatch> = first(
    re(/cancel/, m => m.clearDialogs()),
    re(/time/, m => m.reply(`the time is ${Date.now}`)),
    dialogs.rule(),
    re(/start game/, m => m.beginDialog('game')),
);