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

export interface IDialogRootMatch<M extends Match = any> {
    beginChildDialog<DIALOGARGS extends object = any>(dialog: IDialog<M, DIALOGARGS>, args?: DIALOGARGS): Promise<void>;
    clearChildDialog(): Promise<void>;
}

export type IDialogData<DIALOGDATA extends object> = { childDialogInstance?: DialogInstance } & DIALOGDATA;

export interface IDialogMatch<M extends Match = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any> extends IDialogRootMatch<M> {
    dialogData: IDialogData<DIALOGDATA>;
    dialogStack: DialogInstance[];
    replaceThisDialog<DIALOGARGS extends object = any>(dialog: IDialog<M, DIALOGARGS>, args?: DIALOGARGS, response?: DIALOGRESPONSE): Promise<void>;
    endThisDialog(response?: DIALOGRESPONSE): Promise<void>;
}

export interface IDialogArgsMatch<DIALOGARGS extends object> {
    dialogArgs: DIALOGARGS;
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
        rule(dialogInstance: DialogInstance, dialogResponder?: DialogResponder<M, DIALOGRESPONSE>): IRule<M & IDialogMatch<M, DIALOGRESPONSE>>;
        activate(dialogArgs?: DIALOGARGS, setDialogInstance?: (dialogInstace?: DialogInstance) => Observableable<void>): Observable<void>;
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

    runChildIfActive<ANYMATCH extends Match = M, DIALOGRESPONSE extends object = any>(dialogNamed?: IDialog<M, any, DIALOGRESPONSE>, responder: DialogResponder<ANYMATCH, DIALOGRESPONSE> = () => {}): IRule<ANYMATCH> {
        return {
            tryMatch: (match: ANYMATCH & IDialogMatch<ANYMATCH>) => {
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
                        const dialog = this.dialogs[dialogInstance.name];

                        if (!dialog) {
                            console.warn(`The stack references a dialog named "${dialogInstance.name}", which doesn't exist.`);
                            return Observable.empty<RuleResult>();
                        }

                        if (dialogNamed && dialogNamed !== dialog)
                            return Observable.empty<RuleResult>();
                        
                        return dialog(match as any).rule(dialogInstance, responder as any).tryMatch(match as any);
                    });
            }
        } as IRule<ANYMATCH>;
    }

    matchRootDialog(match: M): M & IDialogRootMatch<M> {
        const setDialogInstance = (dialogInstance?: DialogInstance) => this.rootDialogInstance.set(match, dialogInstance);
        return {
            ... match as any,
            beginChildDialog: <DIALOGARGS extends object = any>(dialog: IDialog<M, DIALOGARGS>, args?: DIALOGARGS) =>
                dialog(match).activate(args, setDialogInstance).toPromise(),
            clearChildDialog: () => toObservable(setDialogInstance()).toPromise(),
        }
    }

    addLocal<
        DIALOGARGS extends object = any,
        DIALOGRESPONSE extends object = any,
        DIALOGDATA extends object = any
    >(
        setInitialState: (match: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA> = () => ({} as DIALOGDATA),
        rule: IRule<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>,
        localName: string,
        remoteName?: string
    ): IDialog<M, DIALOGARGS, DIALOGRESPONSE> {
    
        if (this.dialogs[localName]) {
            console.warn(`You attempted to add a dialog named "${localName}" but a dialog with that name already exists.`);
            return;
        }

        const ruleT = ruleize(rule);
    
        const dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE> = (m: M) => ({
            activate: (dialogArgs: DIALOGARGS, setDialogInstance?: (dialogInstace?: DialogInstance) => Observableable<void>) =>
                toObservable(setInitialState({
                    ... m as any,
                    dialogArgs
                } as M & IDialogArgsMatch<DIALOGARGS>))
                    .flatMap(dialogData =>
                        toObservable(this.localDialogInstances.newInstance(localName, dialogData))
                            .flatMap(dialogInstance => toObservable(setDialogInstance(dialogInstance)))
                    ),

            rule: (dialogInstance: DialogInstance, dialogResponder?: DialogResponder<M, DIALOGRESPONSE>) => ({
                tryMatch: (match: M & IDialogMatch<M, DIALOGRESPONSE>) =>
                    toObservable(this.localDialogInstances.getDialogData<DIALOGDATA>(dialogInstance))
                        .flatMap(dialogData =>
                            ruleT.tryMatch({
                                ... match as any,

                                dialogData,
                                dialogStack: [... match.dialogStack, dialogInstance],

                                beginChildDialog: <DIALOGARGS extends object = any>(dialog: IDialog<M, DIALOGARGS>, args?: DIALOGARGS) =>
                                    dialog(match).activate(args, (dialogInstance: DialogInstance) => {
                                            match.dialogData.childDialogInstance = dialogInstance;
                                        }).toPromise(),
                                clearChildDialog: () => new Promise<void>(() => dialogData.childDialogInstance = undefined),
                                replaceThisDialog: <DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any>(dialog: IDialog<M, DIALOGARGS>, args?: DIALOGARGS, dialogResponse?: DIALOGRESPONSE) =>
                                    toObservable(dialogResponder({
                                        ... match as any,
                                        dialogResponse
                                    }))
                                        .toPromise()
                                        .then(() => match.beginChildDialog(dialog, args)),
                                endThisDialog: <DIALOGRESPONSE extends object = any>(dialogResponse?: DIALOGRESPONSE) =>
                                    toObservable(dialogResponder({
                                        ... match as any,
                                        dialogResponse
                                    }))
                                        .toPromise()
                                        .then(() => match.clearChildDialog()),
                            })
                            .map(ruleResult => ({
                                ... ruleResult,
                                action: () =>
                                    toObservable(ruleResult.action())
                                        .flatMap(_ => toObservable(this.localDialogInstances.setDialogData(dialogInstance, dialogData)))
                            } as RuleResult))
                        )
            } as IRule<M & IDialogMatch<M, DIALOGRESPONSE>>)
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
