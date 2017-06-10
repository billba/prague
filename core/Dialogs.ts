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
    activeDialogInstance?: DialogInstance;
    beginDialog(name: string, args?: any): void;
    replaceDialog(name: string, args?: any): void;
    endDialog(): void;
    clearDialogs(): void;
}

export interface IDialogStateMatch<DIALOGSTATE> {
    dialogData?: DIALOGSTATE;
}

export interface IDialog<M extends IDialogMatch> {
    invoke(name: string, args?: any): Observable<string>;
    tryMatch(dialogInstance: DialogInstance, match: M): Observable<RuleResult>;
}

export function isDialog<M extends IDialogMatch>(dialog: IDialog<M> | IRule<M>): dialog is IDialog<M> {
    return ((dialog as any).invoke !== undefined);
}

export function dialogize<M extends IDialogMatch>(dialog: IDialog<M> | IRule<M>): IDialog<M> {
    return isDialog<M>(dialog)
        ? dialog
        : {
            invoke: () => Observable.of("shared instance"),
            tryMatch: (dialogInstance: DialogInstance, match: M) => dialog.tryMatch(match)
        }
}

export class Dialogs<M extends IDialogMatch> extends BaseRule<M> {
    private dialogs: {
        [name: string]: IDialog<M>;
    }

    constructor(
        private getActiveDialogInstance: (match: M) => Observizeable<DialogInstance>,
        private setActiveDialogInstance: (match: M, activeDialog?: DialogInstance) => Observizeable<void>
    ) {
        super();
    }

    matchDialog<N extends Match = any>(match: M, currentDialogInstance: DialogInstance = rootDialogInstance) {
        return match && {
            ... match as any,
            currentDialogInstance,
            activeDialogInstance: this.getActiveDialogInstance(match)
            // beginDialog: (name: string, args?: any) => this.beginDialog(match, name, args),
            // endDialog:
        } as M & IDialogMatch
    }

    add(name: string, dialog: IDialog<M & IDialogMatch> | IRule<M & IDialogMatch>) {
        if (this.dialogs[name]) {
            console.warn(`You attempted to add a dialog named "${name}" but a dialog with that name already exists.`);
            return;
        }
        this.dialogs[name] = dialogize<M>(dialog);
    }

    invoke(name: string, match: Match, args?: any) {
        const dialog = blah(name);
        const instance = blah.invoke(args);
        this.setActiveDialog(match, { name, instance })
    }

    tryMatch(match: M): Observable<RuleResult> {
        return observize(this.getActiveDialog(match))
            .flatMap(activeDialog => {
                const dialog = this.dialogs[activeDialog.name];
                if (!dialog) {
                    console.warn(`A dialog named "${activeDialog.name}" doesn't exist.`);
                    return Observable.empty<RuleResult>();
                }
                return dialog.tryMatch(currentDialogInstance, {
                        ... match as any,
                        currentDialogInstance: activeDialog
                    });
            });
    }
}

export class RemoteDialogs<M extends IDialogMatch = any> {
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
                    .catch(error => {
                        konsole.log("Network error calling remote invoke()", error);
                        return Observable.empty();
                    })
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
                    .catch(error => {
                        konsole.log("Network error calling remote tryMatch()", error);
                        return Observable.empty();
                    })
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

export class LocalDialogs<M extends IDialogMatch = any> {
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

import { first } from './Rules';
import { re } from './RegExp';

const activeDialogInstances: {
    [name: string]: any[];
} = {};

const newDialogInstance = (name: string, dialogData: any = {}) => {
    if (!activeDialogInstances[name])
        activeDialogInstances[name] = [];
    return (activeDialogInstances[name].push(dialogData) - 1).toString();
}

const getDialogData = (dialogInstance: DialogInstance) =>
    activeDialogInstances[dialogInstance.name][dialogInstance.instance];

const setDialogData = (dialogInstance: DialogInstance, dialogData?: any) => {
    activeDialogInstances[dialogInstance.name][dialogInstance.instance] = dialogData;
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

const local = new LocalDialogs<IGameMatch>(newDialogInstance, getDialogData, setDialogData);
const gameDialog = local.dialog<GameState>(
    re(/answer/, m => m.reply(`The answer is ${m.dialogData.num}`)),
    () => ({ num: Math.random() * 100 })
);

