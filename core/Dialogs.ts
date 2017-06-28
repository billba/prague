import { Match, IRule, Handler, ruleize, RuleResult, Observableable, toObservable, toFilteredObservable } from './Rules';
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

export interface IDialogRuleMatch<DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any> extends IDialogRootMatch {
    dialogData: IDialogData<DIALOGDATA>;
    dialogStack: DialogInstance[];
    replaceThisDialog<DIALOGARGS = any>(name: string, args?: DIALOGARGS, response?: DIALOGRESPONSE): Promise<void>;
    endThisDialog(response?: DIALOGRESPONSE): Promise<void>;
}

export interface IDialogRootMatch {
    beginChildDialog<DIALOGARGS extends object = any>(name: string, args?: DIALOGARGS): Promise<void>;
    clearChildDialog(): Promise<void>;
}

export type IDialogData<DIALOGDATA extends object> = { childDialogInstance?: DialogInstance } & DIALOGDATA;

export interface IDialogMatch<DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any> extends IDialogRootMatch {
    dialogData: IDialogData<DIALOGDATA>;
    dialogStack: DialogInstance[];
    replaceThisDialog<DIALOGARGS = any>(name: string, args?: DIALOGARGS, response?: DIALOGRESPONSE): Promise<void>;
    endThisDialog(response?: DIALOGRESPONSE): Promise<void>;
}

export interface IDialogArgsMatch<DIALOGARGS extends object> {
    dialogArgs: DIALOGARGS;
}

export interface DialogStart<
    M extends Match = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGDATA extends object = any
> {
    (match: M & IDialogMatch<DIALOGRESPONSE> & IDialogArgsMatch<DIALOGARGS>): Observableable<DIALOGDATA>;
}

export interface DialogResponder<M extends Match = any, DIALOGRESPONSE extends object = any> {
    (match: M & IDialogResponderMatch<DIALOGRESPONSE>): Observableable<void>;
}


export interface IDialogResponderMatch<DIALOGRESPONSE extends object = object> {
    dialogResponse: DIALOGRESPONSE;
}

export interface IDialog<
    M extends Match = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any
> {
    (match: M): {
        rule(handleResponse?: DialogResponder<M, DIALOGRESPONSE>): IRule<M & IDialogMatch<DIALOGRESPONSE>>;
        activate(dialogArgs?: DIALOGARGS): Observable<void>;
    }
}

export interface RootDialogInstance<M extends Match = any> {
    get: (match: M) => Observableable<DialogInstance>;
    set: (match: M, rootDialogInstance?: DialogInstance) => Observableable<void>;
}

export interface DialogResponders<M extends Match = any> {
    [name: string]: DialogResponder<M>;
}

export interface LocalDialogInstances {
    newInstance: <DIALOGDATA extends object = any>(name: string, dialogData: IDialogData<DIALOGDATA>) => Observableable<DialogInstance>,
    getDialogData: <DIALOGDATA extends object = any>(dialogInstance: DialogInstance) => Observableable<IDialogData<DIALOGDATA>>,
    setDialogData: <DIALOGDATA extends object = any>(dialogInstance: DialogInstance, dialogData?: IDialogData<DIALOGDATA>) => Observableable<void>
}

// export interface RemoteDialogProxy {
//     private matchRemoteDialog: (match: M & IDialogMatch) => any,
//     private executeTasks: (response: tasks) => Observizeable<void>
// }

export class Dialogs<M extends Match = any> {
    private dialogs: DialogRegistry<M> = {}

    constructor(
        private rootDialogInstance: RootDialogInstance,
        private localDialogInstances: LocalDialogInstances,
    ) {
    }

    private invokeDialog<M extends Match = any, DIALOGARGS extends object = any>(match: M, name: string, args: DIALOGARGS) : Observable<DialogInstance> {
        const dialog = this.dialogs[name];
        if (!dialog)
            throw new Error(`You attempted to begin a dialog named "${name}" but no dialog with that name exists.`);
        
        return dialog.invoke(name, {
                ... match as any,
                dialogArgs: args
            })
            .map(instance => ({ name, instance }));
    }

    runChildIfActive<ANYMATCH extends Match = M, DIALOGRESPONSE extends object = any>(name: string, responder?: DialogResponder<ANYMATCH, DIALOGRESPONSE>): IRule<ANYMATCH>;
    runChildIfActive<ANYMATCH extends Match = M>(responders?: DialogResponders<ANYMATCH>): IRule<ANYMATCH>;
    runChildIfActive<ANYMATCH extends Match = M>(arg0: any, arg1?: any): IRule<ANYMATCH> {
        const dialogResponders: DialogResponders<ANYMATCH> = arg0
            ? arg1
                ? { [arg0]: arg1 }
                : typeof arg0 === "object"
                    ? arg0
                    : { [arg0]: () => {} }
            : undefined;

        return {
            tryMatch: (match: ANYMATCH & IDialogMatch) => {
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
                    odi = toObservable(this.rootDialogInstance.get(match));
                }

                return odi
                    .filter(dialogInstance => !!dialogInstance)
                    .flatMap(dialogInstance => {
                        let dialogResponder: DialogResponder<ANYMATCH> = () => {};
                        if (dialogResponders) {
                            dialogResponder = dialogResponders[dialogInstance.name];
                            if (!dialogResponder)
                                return Observable.empty<RuleResult>();
                        }

                        const dialog = this.dialogs[dialogInstance.name];
                        if (!dialog) {
                            console.warn(`The stack references a dialog named "${dialogInstance.name}", which doesn't exist.`);
                            return Observable.empty<RuleResult>();
                        }

                        return dialog.tryMatch(dialogInstance, {
                            ... match as any,
                            replaceThisDialog: <DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any>(name: string, args?: DIALOGARGS, dialogResponse?: DIALOGRESPONSE) =>
                                toObservable(dialogResponder({
                                    ... match as any,
                                    dialogResponse
                                }))
                                    .toPromise()
                                    .then(() => match.beginChildDialog(name, args)),
                            endThisDialog: <DIALOGRESPONSE extends object = any>(dialogResponse?: DIALOGRESPONSE) =>
                                toObservable(dialogResponder({
                                    ... match as any,
                                    dialogResponse
                                }))
                                    .toPromise()
                                    .then(() => match.clearChildDialog()),
                        });
                    });
            }
        } as IRule<ANYMATCH>;
    }

    matchRootDialog(match: M): M & IDialogRootMatch {
        return {
            ... match as any,
            beginChildDialog: <DIALOGARGS extends object = any>(name: string, args?: DIALOGARGS) =>
                this.invokeDialog(match, name, args)
                    .flatMap(dialogInstance => toObservable(this.rootDialogInstance.set(match, dialogInstance)))
                    .toPromise(),
            clearChildDialog: () => toObservable(this.rootDialogInstance.set(match)).toPromise(),
        }
    }

    addLocal<
        DIALOGARGS extends object = any,
        DIALOGRESPONSE extends object = any,
        DIALOGDATA extends object = any
    >(
        setInitialState: (match: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA> = () => ({} as DIALOGDATA),
        rule: IRule<M & IDialogMatch<DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<DIALOGRESPONSE, DIALOGDATA>>,
        localName: string,
        remoteName?: string
    ): IDialog<M, DIALOGARGS, DIALOGRESPONSE> {
    
        if (this.dialogs[localName]) {
            console.warn(`You attempted to add a dialog named "${localName}" but a dialog with that name already exists.`);
            return;
        }

        const ruleT = ruleize(rule);
    
        const dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE> = (m: M) => ({
            activate: (dialogArgs: DIALOGARGS) =>
                toObservable(setInitialState({
                    ... m as any,
                    dialogArgs
                } as M & IDialogArgsMatch<DIALOGARGS>))
                    .flatMap(dialogData =>
                        toObservable(this.localDialogInstances.newInstance(localName, dialogData))
                            .flatMap(dialogInstance => Observable.of<void>(/* set dialog instance using m */))
                    ),

            rule: (handleResponse?: DialogResponder<M, DIALOGRESPONSE>) => ({
                tryMatch: (match: M & IDialogMatch<DIALOGRESPONSE>) =>
                    Observable.of<DialogInstance>() /* get dialog instance using m */
                    .flatMap(dialogInstance => 
                        toObservable(this.localDialogInstances.getDialogData<DIALOGDATA>(dialogInstance))
                        .flatMap(dialogData =>
                            ruleT.tryMatch({
                                ... match as any,

                                dialogData,
                                dialogStack: [... match.dialogStack, dialogInstance],

                                // add endThisDialog and replaceThisDialog in here, per other branch
                                beginChildDialog: <DIALOGARGS extends object = any>(name: string, args?: DIALOGARGS) =>
                                    this.invokeDialog(match, name, args)
                                        .toPromise()
                                        .then(dialogInstance => {
                                            dialogData.childDialogInstance = dialogInstance;
                                            return;
                                        }),
                                clearChildDialog: () => new Promise<void>(() => dialogData.childDialogInstance = undefined),
                            })
                            .map(ruleResult => ({
                                ... ruleResult,
                                action: () =>
                                    toObservable(ruleResult.action())
                                        .flatMap(_ => toObservable(this.localDialogInstances.setDialogData(dialogInstance, dialogData)))
                            } as RuleResult))
                        )
                    )
            } as IRule<M & IDialogMatch<DIALOGRESPONSE>>)
        });

        this.dialogs[localName] = dialog;
        return dialog;
    }

    // addRemote<DIALOGARGS>(
    //     name: string,
    //     remoteUrl: string,
    //     remoteName: string
    // ): IDialog<M, DIALOGARGS> {
    //     return {
    //         invoke: (name: string, match: M & IDialogMatch & IDialogArgsMatch<DIALOGARGS>) =>
    //             Observable.fromPromise(
    //                     fetch(
    //                         remoteUrl + "/invoke", {
    //                             method: 'POST',
    //                             body: {
    //                                 name,
    //                                 match // this needs to be transformed too!
    //                             }
    //                         }
    //                     )
    //                     .then(response => response.json())
    //                 )
    //                 .flatMap(json => {
    //                     switch (json.status) {
    //                         case 'success':
    //                             return Observable.of(json.instance);
    //                         case 'error':
    //                             return Observable.throw(`RemoteDialog.invoke() returned error "${json.error}".`);
    //                         default:
    //                             return Observable.throw(`RemoteDialog.invoke() returned unexpected status "${json.status}".`);
    //                     }
    //                 }),

    //         tryMatch: (dialogInstance: DialogInstance, match: M & IDialogMatch) =>
    //             Observable.fromPromise(
    //                     fetch(
    //                         remoteUrl + "/tryMatch", {
    //                             method: 'POST',
    //                             body: {
    //                                 name,
    //                                 instance,
    //                                 match: this.matchRemoteDialog(match)
    //                             }
    //                         }
    //                     )
    //                     .then(response => response.json())
    //                 )
    //                 .flatMap(json => {
    //                     switch (json.status) {
    //                         case 'end':
    //                             // end dialog, then fall through
    //                         case 'result':
    //                             return observize(this.handleSuccessfulResponse(json.ruleResult));
    //                         case 'matchless':
    //                             return Observable.empty<void>();
    //                         case 'error':
    //                             return Observable.throw(`RemoteDialog.tryMatch() returned error "${json.error}".`);
    //                         default:
    //                             return Observable.throw(`RemoteDialog.tryMatch() returned unexpected status "${json.status}".`);
    //                     }
    //                 })
    //     }
    // }

}
