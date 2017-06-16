import { Match, IRule, BaseRule, RuleResult, Observableable, toObservable, toFilteredObservable } from './Rules';
import { Observable } from 'rxjs';
import { konsole } from './Konsole';

const pragueRoot = 'pragueRoot';

export interface DialogInstance {
    name: string;
    instance: string;
}

export interface DialogRegistry<M extends Match = any> {
    [name: string]: IDialog<M>;
}

export interface IDialogRootMatch {
    dialogs: DialogRegistry;
    beginChildDialog<DIALOGARGS = any>(name: string, args?: DIALOGARGS): Observableable<void>;
    clearChildDialog(): Observableable<void>;
}

export interface IDialogMatch<DIALOGRESPONSE extends object = any, DIALOGDATA = undefined> extends IDialogRootMatch {
    dialogData: { childDialogInstance: DialogInstance } & DIALOGDATA;
    dialogStack: DialogInstance[];
    replaceThisDialog<DIALOGARGS = any>(name: string, args?: DIALOGARGS, response?: DIALOGRESPONSE): Observableable<void>;
    endThisDialog(response?: DIALOGRESPONSE): Observableable<void>;
}

export interface IDialogArgsMatch<DIALOGARGS> {
    dialogArgs: DIALOGARGS;
}

export interface IDialog<M extends Match = any, DIALOGARGS = any, DIALOGRESPONSE extends object = any> {
    invoke(name: string, match: M & IDialogMatch<DIALOGRESPONSE> & IDialogArgsMatch<DIALOGARGS>): Observable<string>;
    tryMatch(dialogInstance: DialogInstance, match: M & IDialogMatch<DIALOGRESPONSE>): Observable<RuleResult>;
}

export interface DialogStackManager<M extends Match = any> {
    getRootDialogInstance: (match: M) => Observableable<DialogInstance>;
    setRootDialogInstance: (match:  M, rootDialogInstance?: DialogInstance) => Observableable<void>;
}

export interface IDialogResponderMatch<DIALOGRESPONSE extends object = object> {
    dialogResponse: DIALOGRESPONSE;
}

export interface DialogResponder<M extends Match = any, DIALOGRESPONSE extends object = any> {
    (match: M & IDialogMatch<DIALOGRESPONSE> & IDialogResponderMatch<DIALOGRESPONSE>): Observableable<void>;
}

export interface DialogResponders<M extends Match = any> {
    [name: string]: DialogResponder<M>;
}

function setChildDialogInstance<M extends Match = any>(match: M & IDialogMatch, dialogInstance?: DialogInstance) {
    if (match.dialogData)
        match.dialogData.childDialogInstance = dialogInstance;
    else
        this.dsm.setRootDialogInstance(match, dialogInstance);
}

function beginChildDialog<M extends Match = any, DIALOGARGS = any>(dialogs: DialogRegistry, match: M, name: string, args?: DIALOGARGS) {
    const dialog = this.dialogs[name];
    if (!dialog)
        throw new Error(`You attempted to begin a dialog named "${name}" but no dialog with that name exists.`);
    
    return dialog.invoke(name, {
            ... match as any,
            dialogArgs: args
        })
        .flatMap(instance => toObservable(setChildDialogInstance(match as any, { name, instance })));
}

export class Dialogs<M extends Match = any> {
    private dialogs: DialogRegistry<M> = {}

    constructor(private dsm: DialogStackManager) {
    }

    add(name: string, dialog: IDialog<M>) {
        if (this.dialogs[name]) {
            console.warn(`You attempted to add a dialog named "${name}" but a dialog with that name already exists.`);
            return;
        }
        this.dialogs[name] = dialog;
    }

    runChildIfActive<ANYMATCH extends Match = M, DIALOGRESPONSE extends object = any>(name: string, responder: DialogResponder<ANYMATCH, DIALOGRESPONSE>): IRule<ANYMATCH>;
    runChildIfActive<ANYMATCH extends Match = M>(responders?: DialogResponders<ANYMATCH>): IRule<ANYMATCH>;
    runChildIfActive<ANYMATCH extends Match = M>(... args: any[]): IRule<ANYMATCH> {
        const dialogs = this.dialogs,
            dsm: DialogStackManager<ANYMATCH> = this.dsm;

        return new class extends BaseRule<ANYMATCH & IDialogMatch> {
            dialogResponders: DialogResponders<ANYMATCH>;

            constructor(... args: any[]) {
                super();
                if (args.length === 1)
                    this.dialogResponders = typeof args[0] === "object"
                         ? { [args[0]]: () => {} }
                         : args[0];
                else if (args.length === 2)
                    this.dialogResponders = { [args[0]]: args[1] };
            }

            tryMatch(match: ANYMATCH & IDialogMatch): Observable<RuleResult> {
                console.log("runIfActive.tryMatch", match);

                let odi: Observable<DialogInstance>;
                if (match.dialogStack) {
                    odi = Observable.of(match.dialogData.childDialogInstance);
                } else {
                    // This is being run from a non-dialog rule
                    match = {
                        ... match as any,
                        dialogStack: [],
                    }
                    odi = toObservable(dsm.getRootDialogInstance(match));
                }

                return odi
                    .flatMap(dialogInstance => {
                        let dialogResponder: DialogResponder<ANYMATCH> = () => {};
                        if (this.dialogResponders) {
                            dialogResponder = this.dialogResponders[dialogInstance.name];
                            if (!dialogResponder)
                                return Observable.empty<RuleResult>();
                        }

                        const dialog = dialogs[dialogInstance.name];
                        if (!dialog) {
                            console.warn(`The stack references a dialog named "${dialogInstance.name}", which doesn't exist.`);
                            return Observable.empty<RuleResult>();
                        }

                        return dialog.tryMatch(dialogInstance, {
                            ... match as any,
                            dialogStack: [... match.dialogStack, dialogInstance],

                            replaceThisDialog: <DIALOGARGS = any, DIALOGRESPONSE extends object = any>(name: string, args?: DIALOGARGS, dialogResponse?: DIALOGRESPONSE) =>
                                toObservable(dialogResponder({
                                        ... match as any,
                                        dialogResponse
                                    }))
                                    .flatMap(_ => toObservable(match.beginChildDialog(name, args))),
                            endThisDialog: <DIALOGRESPONSE extends object = any>(dialogResponse?: DIALOGRESPONSE) =>
                                toObservable(dialogResponder({
                                        ... match as any,
                                        dialogResponse
                                    }))
                                    .flatMap(_ => toObservable(match.clearChildDialog()))
                        });
                    });
            }
        }(... args) as IRule<ANYMATCH>;
    }

    matchDialog(match: M): M & IDialogRootMatch {
        return {
            ... match as any,
            dialogs: this.dialogs,
            beginChildDialog: <DIALOGARGS>(name: string, args?: DIALOGARGS) => beginChildDialog(this.dialogs, match, name, args),
            clearChildDialog: () => this.dsm.setRootDialogInstance(match)
        }
    }
}

/*
export class RemoteDialogs<M extends Match = any> {
    constructor(
        private matchRemoteDialog: (match: M & IDialogMatch) => any,
        private executeTasks: (response: tasks) => Observizeable<void>,
    ) {
    }

    dialog<DIALOGARGS>(
        remoteUrl: string,
        remoteName: string
    ): IDialog<M, DIALOGARGS> {
        return {
            invoke: (name: string, match: M & IDialogMatch & IDialogArgsMatch<DIALOGARGS>) =>
                Observable.fromPromise(
                        fetch(
                            remoteUrl + "/invoke", {
                                method: 'POST',
                                body: {
                                    name,
                                    match // this needs to be transformed too!
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

            tryMatch: (dialogInstance: DialogInstance, match: M & IDialogMatch) =>
                Observable.fromPromise(
                        fetch(
                            remoteUrl + "/tryMatch", {
                                method: 'POST',
                                body: {
                                    name,
                                    instance,
                                    match: this.matchRemoteDialog(match)
                                }
                            }
                        )
                        .then(response => response.json())
                    )
                    .flatMap(json => {
                        switch (json.status) {
                            case 'end':
                                // end dialog, then fall through
                            case 'result':
                                return observize(this.handleSuccessfulResponse(json.ruleResult));
                            case 'matchless':
                                return Observable.empty<void>();
                            case 'error':
                                return Observable.throw(`RemoteDialog.tryMatch() returned error "${json.error}".`);
                            default:
                                return Observable.throw(`RemoteDialog.tryMatch() returned unexpected status "${json.status}".`);
                        }
                    })
        }
    }
}
*/

export interface DialogInstances {
    newInstance: (name: string, dialogData: any) => Observableable<string>,
    getDialogData: (dialogInstance: DialogInstance) => Observableable<any>,
    setDialogData: (dialogInstance: DialogInstance, dialogData?: any) => Observableable<void>
}

export class LocalDialogs<M extends Match = any> {
    constructor(private dialogInstances: DialogInstances) {
    }

    dialog<
        DIALOGDATA = any,
        DIALOGARGS = any,
        DIALOGRESPONSE extends object = object
    >(
        rule: IRule<M & IDialogMatch<DIALOGRESPONSE, DIALOGDATA>>,
        init: (match: M & IDialogMatch<DIALOGRESPONSE> & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA> = () => ({} as DIALOGDATA)
    ): IDialog<M, DIALOGARGS, DIALOGRESPONSE> {
        return {
            invoke: (name: string, match: M & IDialogMatch<DIALOGRESPONSE> & IDialogArgsMatch<DIALOGARGS>) =>
                toObservable(init(match))
                    .flatMap(dialogData => toObservable(this.dialogInstances.newInstance(name, dialogData))),

            tryMatch: (dialogInstance: DialogInstance, match: M & IDialogMatch<DIALOGRESPONSE>) =>
                toObservable(this.dialogInstances.getDialogData(dialogInstance) as DIALOGDATA)
                    .flatMap(dialogData =>
                        rule.tryMatch({
                            ... match as any,
                            dialogData,

                            beginChildDialog: <DIALOGARGS>(name: string, args?: DIALOGARGS) => beginChildDialog(match.dialogs, match, name, args),
                            clearChildDialog: () => setChildDialogInstance(match),
                        })
                        .map(ruleResult => ({
                            ... ruleResult,
                            action: () =>
                                toObservable(ruleResult.action())
                                .flatMap(_ => toObservable(this.dialogInstances.setDialogData(dialogInstance, dialogData)))
                        }))
                    )
        }
    }
}
