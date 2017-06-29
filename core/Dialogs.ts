import { Match, IRule, Handler, ruleize, RuleResult, Observableable, toObservable } from './Rules';
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
        activate(dialogArgs?: DIALOGARGS): Observable<DialogInstance>;
    }
}

export interface RootDialogInstance {
    get: (match: any) => Observableable<DialogInstance>;
    set: (match: any, rootDialogInstance?: DialogInstance) => Observableable<void>;
}

export interface DialogResponders<M extends Match = any> {
    [name: string]: DialogResponder<M>;
}

export interface LocalDialogInstances {
    newInstance: <DIALOGDATA extends object = any>(name: string, dialogData: IDialogData<DIALOGDATA>) => Observableable<DialogInstance>,
    getDialogData: <DIALOGDATA extends object = any>(dialogInstance: DialogInstance) => Observableable<IDialogData<DIALOGDATA>>,
    setDialogData: <DIALOGDATA extends object = any>(dialogInstance: DialogInstance, dialogData?: IDialogData<DIALOGDATA>) => Observableable<void>
}


export interface RemoteDialogProxy<M extends Match = any> {
    matchLocalToRemote: (match: M) => Observableable<any>,
    matchRemoteToLocal: (match: any) => Observableable<M>,
    executeTasks: (tasks: any) => Observableable<any>,
}

export interface RemoteActivateRequest {
    method: 'activate';
    name: string;
    match: any;
    args: any;
}

export type RemoteActivateResponse = {
    status: 'success';
    instance: string;
} | {
    status: 'error';
    error: string;
}

export interface RemoteTryMatchRequest {
    method: 'tryMatch';
    name: string;
    instance: string;
    match: any;
}

export type RemoteTryMatchResponse = {
    status: 'result';
    tasks?: any[];
} | {
    status: 'endThisDialog';
    response?: any;
} | {
    status: 'replaceThisDialog';
    response?: any;
    name: string;
    args?: string;
} | {
    status: 'matchless';
} | {
    status: 'error';
    error: string;
}

export type RemoteRequest = RemoteActivateRequest | RemoteTryMatchRequest;

export type RemoteResponse = RemoteActivateResponse | RemoteTryMatchResponse;

export class Dialogs<M extends Match = any> {
    private dialogs: DialogRegistry<M> = {}

    constructor(
        private rootDialogInstance: RootDialogInstance,
        private localDialogInstances: LocalDialogInstances,
        private remoteDialogProxy: RemoteDialogProxy<M>,
    ) {
    }

    runChildIfActive<ANYMATCH extends Match = M, DIALOGRESPONSE extends object = any>(dialogNamed?: IDialog<M, any, DIALOGRESPONSE>, responder: DialogResponder<ANYMATCH, DIALOGRESPONSE> = () => {}): IRule<ANYMATCH> {
        return {
            tryMatch: (match: ANYMATCH & IDialogMatch<ANYMATCH>) => {

                console.log("runChildIfActive", match);

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
        return {
            ... match as any,
            beginChildDialog: <DIALOGARGS extends object = any>(dialog: IDialog<M, DIALOGARGS>, args?: DIALOGARGS) =>
                dialog(match)
                    .activate(args)
                    .flatMap(dialogInstance => toObservable(this.rootDialogInstance.set(match, dialogInstance)))
                    .toPromise(),
            clearChildDialog: () => toObservable(this.rootDialogInstance.set(match)).toPromise()
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
            activate: (dialogArgs: DIALOGARGS) =>
                toObservable(setInitialState({
                    ... m as any,
                    dialogArgs
                } as M & IDialogArgsMatch<DIALOGARGS>))
                    .flatMap(dialogData => toObservable(this.localDialogInstances.newInstance(localName, dialogData))),

            rule: (dialogInstance: DialogInstance, dialogResponder?: DialogResponder<M, DIALOGRESPONSE>) => ({
                tryMatch: (match: M & IDialogMatch<M, DIALOGRESPONSE>) =>
                    toObservable(this.localDialogInstances.getDialogData<DIALOGDATA>(dialogInstance))
                        .flatMap(dialogData =>
                            ruleT.tryMatch({
                                ... match as any,

                                dialogData,
                                dialogStack: [... match.dialogStack, dialogInstance],

                                beginChildDialog: <DIALOGARGS extends object = any>(dialog: IDialog<M, DIALOGARGS>, args?: DIALOGARGS) =>
                                    dialog(match)
                                        .activate(args)
                                        .do(dialogInstance => match.dialogData.childDialogInstance = dialogInstance)
                                        .toPromise(),
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
                                action: () => toObservable(ruleResult.action())
                                    .flatMap(_ => toObservable(this.localDialogInstances.setDialogData(dialogInstance, dialogData)))
                            } as RuleResult))
                        )
            } as IRule<M & IDialogMatch<M, DIALOGRESPONSE>>)
        });

        this.dialogs[localName] = dialog;
        return dialog;
    }

    addRemote<
        DIALOGARGS extends object = any,
        DIALOGRESPONSE extends object = any,
        DIALOGDATA extends object = any
    >(
        remoteUrl: string,
        remoteName: string,
        localName?: string,
    ): IDialog<M> {

        localName = localName || remoteName;

        if (this.dialogs[localName]) {
            console.warn(`You attempted to add a dialog named "${name}" but a dialog with that name already exists.`);
            return;
        }

        const dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE> = (m: M) => ({
            activate: (dialogArgs: DIALOGARGS) =>
                toObservable(this.remoteDialogProxy.matchLocalToRemote(m))
                    .flatMap(match =>
                        fetch(
                            remoteUrl,
                            {
                                method: 'POST',
                                headers: new Headers({
                                    'Content-Type': 'application/json',
                                    }),
                                body: JSON.stringify({
                                    method: 'activate',
                                    name: remoteName,
                                    args: dialogArgs,
                                    match
                                } as RemoteActivateRequest)
                            }
                        )
                        .then(response => response.json() as Promise<RemoteActivateResponse>)
                    )
                    .flatMap(response => {
                        switch (response.status) {
                            case 'success':
                                return Observable.of({
                                    name: localName,
                                    instance: response.instance as string
                                } as DialogInstance);
                            case 'error':
                                return Observable.throw(`RemoteDialog.activate returned error "${response.error}".`);
                            default:
                                return Observable.throw(`RemoteDialog.activate returned unexpected status "${(response as any).status}".`);
                        }
                    }),

            rule: (dialogInstance: DialogInstance, dialogResponder?: DialogResponder<M, DIALOGRESPONSE>) => ({
                tryMatch: (match: M & IDialogMatch<M, DIALOGRESPONSE>) =>
                    toObservable(this.remoteDialogProxy.matchLocalToRemote(match))
                        .flatMap(match =>
                            fetch(
                                remoteUrl,
                                {
                                    method: 'POST',
                                    headers: new Headers({
                                        'Content-Type': 'application/json',
                                        }),
                                    body: JSON.stringify({
                                        method: 'tryMatch',
                                        name: remoteName,
                                        instance: dialogInstance.instance,
                                        match
                                    })
                                }
                            )
                            .then(response => response.json() as Promise<RemoteTryMatchResponse>)
                        )
                        .flatMap<RemoteTryMatchResponse, RuleResult>(response => {
                            switch (response.status) {
                                case 'replaceThisDialog':
                                    // end dialog, handle response, start new dialog
                                    return Observable.empty<RuleResult>();
                                case 'endThisDialog':
                                    // end dialog, handle response
                                    return Observable.empty<RuleResult>();
                                case 'result':
                                    return Observable.of({
                                        action: () => this.remoteDialogProxy.executeTasks(response.tasks)
                                    } as RuleResult);
                                case 'matchless':
                                    return Observable.empty<RuleResult>();
                                case 'error':
                                    return Observable.throw(`RemoteDialog.tryMatch returned error "${response.error}".`);
                                default:
                                    return Observable.throw(`RemoteDialog.tryMatch returned unexpected status "${(response as any).status}".`);
                            }
                        }),
                }),
        });

        this.dialogs[localName] = dialog;
        return dialog;
    }

    // These methods are used to serve up local dialogs remotely

    remoteActivate(name: string, remoteMatch: any, dialogArgs: any): Observable<RemoteActivateResponse> {
        const dialog = this.dialogs[name];
        if (!dialog) {
            return Observable.throw(`An attempt was made to activate a local dialog named ${name}. No such dialog exists.`);
        }

        return dialog({
                ... this.matchRemoteToLocal(remoteMatch) as any,                    // dialog-specific 
                ... this.remoteDialogProxy.matchRemoteToLocal(remoteMatch) as any,  // provided by recipe
            })
            .activate(dialogArgs)
            .map(dialogInstance => ({
                status: 'success'
            } as RemoteActivateResponse))
            .catch(error => Observable.of({
                status: 'error',
                error
            } as RemoteActivateResponse));
    }

    private matchLocalToRemote(match: M & IDialogMatch): any {
        return {
            dialogStack: match.dialogStack,
        }
    }

    private matchRemoteToLocal(match: any) {
        return {
            dialogStack: match.dialogStack as DialogInstance[],
        } as M & IDialogMatch
    }

    remoteTryMatch(name: string, instance: string, remoteMatch: any): Observable<RemoteTryMatchResponse> {
        const dialog = this.dialogs[name];
        if (!dialog) {
            return Observable.throw(`An attempt was made to activate a local dialog named ${name}. No such dialog exists.`);
        }

        const match: M & IDialogMatch = {
            ... this.matchRemoteToLocal(remoteMatch) as any,                    // dialog-specific 
            ... this.remoteDialogProxy.matchRemoteToLocal(remoteMatch) as any,  // provided by recipe
            // beginChildDialog: // normal
            // clearChildDialog: // normal
            // endThisDialog:    // weird return stuff
            // replaceThisDialog:// weird return stuff
        };

        console.log("remoteTryMatch", match);

        return dialog(match)
            .rule({ name, instance })
            .tryMatch(match)
            // add a sentinal value so that we can detect an empty sequence
            .concat(Observable.of(-1))
            // taking the first element gives us the result of tryMatch if there is one, the sentinal value otherwise
            .take(1)
            // testing the type of the result (instead of the value) lets TypeScript resolve the type ambiguity
            .flatMap(ruleResult => typeof ruleResult === 'number'
                ? Observable.of({
                    status: 'matchless'
                } as RemoteTryMatchResponse)
                : toObservable(ruleResult.action())
                    .map(_ => ({
                        status: 'result'
                    } as RemoteTryMatchResponse))
            )
            .catch(error => Observable.of({
                status: 'error',
                error
            } as RemoteTryMatchResponse))
    }
}
