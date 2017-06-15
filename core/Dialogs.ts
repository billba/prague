import { Match, IRule, BaseRule, RuleResult, Observableable, toObservable, toFilteredObservable } from './Rules';
import { Observable } from 'rxjs';
import { konsole } from './Konsole';

const pragueRoot = 'pragueRoot';

export interface DialogInstance {
    name: string;
    instance: string;
}

export interface IDialogRootMatch {
    beginChildDialog<DIALOGARGS = any>(name: string, args?: DIALOGARGS): Observableable<void>;
    clearChildDialog(): Observableable<void>;
}

export interface IDialogMatch<DIALOGRESPONSE extends object = any, DIALOGDATA = undefined> extends IDialogRootMatch {
    dialogData: DIALOGDATA;
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
    getChildDialogInstance: (parent: DialogInstance | M) => Observableable<DialogInstance>;
    setChildDialogInstance: (parent: DialogInstance | M, child?: DialogInstance) => Observableable<void>;
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

export class Dialogs<M extends Match = any> {
    private dialogs: {
        [name: string]: IDialog<M>;
    } = {}

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
            dsm: DialogStackManager<ANYMATCH> = this.dsm,
            beginChildDialog =  <DIALOGARGS = any>(match: ANYMATCH, name: string, args?: DIALOGARGS) => this.beginChildDialog(match as any, name, args),
            clearChildDialog = (match: ANYMATCH) =>this.dsm.setChildDialogInstance(match);
        
        return new class extends BaseRule<ANYMATCH & IDialogMatch> {
            dialogResponders: DialogResponders<ANYMATCH>;

            constructor(... args: any[]) {
                super();
                if (args.length === 1)
                    if (typeof args[0] === "object")
                        this.dialogResponders = { [args[0]]: () => {} };
                    else 
                        this.dialogResponders = args[0];
                else if (args.length === 2)
                    this.dialogResponders = { [args[0]]: args[1] };
            }

            tryMatch(match: ANYMATCH & IDialogMatch): Observable<RuleResult> {
                console.log("runIfActive.tryMatch", match);
                if (!match.dialogStack) {
                    // This is being run from a non-dialog rule
                    match = {
                        ... match as any,
                        dialogStack: [],
                    }
                }
                return (toFilteredObservable(dsm.getChildDialogInstance(match.dialogStack.length
                        ? match.dialogStack[match.dialogStack.length - 1]
                        : match
                    )))
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
                            beginChildDialog: <DIALOGARGS>(name: string, args?: DIALOGARGS) => beginChildDialog(match, name, args),
                            clearChildDialog: () => toObservable(dsm.setChildDialogInstance(match)),
                            replaceThisDialog: <DIALOGARGS = any, DIALOGRESPONSE extends object = any>(name: string, args?: DIALOGARGS, dialogResponse?: DIALOGRESPONSE) =>
                                toObservable(dialogResponder({
                                        ... match as any,
                                        dialogResponse
                                    }))
                                    .flatMap(_ => beginChildDialog(match as any, name, args)),
                            endThisDialog: <DIALOGRESPONSE extends object = any>(dialogResponse?: DIALOGRESPONSE) =>
                                toObservable(dialogResponder({
                                        ... match as any,
                                        dialogResponse
                                    }))
                                    .flatMap(_ => toObservable(dsm.setChildDialogInstance(match)))
                        });
                    });
            }
        }(... args) as IRule<ANYMATCH>
    }

    private beginChildDialog<DIALOGARGS = any>(match: M, name: string, args?: DIALOGARGS) {
        const dialog = this.dialogs[name];
        if (!dialog)
            throw new Error(`You attempted to begin a dialog named "${name}" but no dialog with that name exists.`);
        
        return dialog.invoke(name, {
                ... match as any,
                dialogArgs: args
            })
            .flatMap(instance => toObservable(this.dsm.setChildDialogInstance(match, { name, instance })));
    }

    matchDialog(match: M): M & IDialogRootMatch {
        return {
            ... match as any,
            beginChildDialog: <DIALOGARGS>(name: string, args?: DIALOGARGS) => this.beginChildDialog(match, name, args),
            clearChildDialog: () => toObservable(this.dsm.setChildDialogInstance(match))
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
        DIALOGDATA = undefined,
        DIALOGARGS = any,
        DIALOGRESPONSE extends object = object
    >(
        rule: IRule<M & IDialogMatch<DIALOGRESPONSE, DIALOGDATA>>,
        init?: (match: M & IDialogMatch<DIALOGRESPONSE> & IDialogArgsMatch<DIALOGARGS>) => DIALOGDATA
    ): IDialog<M, DIALOGARGS, DIALOGRESPONSE> {
        return {
            invoke: (name: string, match: M & IDialogMatch<DIALOGRESPONSE> & IDialogArgsMatch<DIALOGARGS>) =>
                (init ? toObservable(init(match)) : Observable.of({}))
                    .flatMap(dialogData => toObservable(this.dialogInstances.newInstance(name, dialogData))),

            tryMatch: (dialogInstance: DialogInstance, match: M & IDialogMatch<DIALOGRESPONSE>) =>
                toObservable(this.dialogInstances.getDialogData(dialogInstance) as DIALOGDATA)
                    .flatMap(dialogData =>
                        rule.tryMatch({
                            ... match as any,
                            dialogData
                        })
                        .map(ruleResult => ({
                            ... ruleResult,
                            action: () =>
                                toObservable(ruleResult.action())
                                .flatMap(_ => toFilteredObservable(this.dialogInstances.setDialogData(dialogInstance, dialogData)))
                        }))
                    )
        }
    }
}
