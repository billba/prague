import { IRouter, Handler, routerize, Route, Observableable, toObservable, toFilteredObservable } from './Rules';
import { Observable } from 'rxjs';
import { konsole } from './Konsole';

export interface DialogInstance {
    name: string;
    instance: string;
}

export interface DialogRegistry<M extends object = any> {
    [name: string]: LocalOrRemoteDialog<M>;
}

export interface IDialogRootMatch<M extends object = any> {
    beginChildDialog<DIALOGARGS extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS): Promise<void>;
    clearChildDialog(): Promise<void>;
}

export type IDialogData<DIALOGDATA extends object> = DIALOGDATA & {
    childDialogInstance?: DialogInstance;
}

export interface IDialogMatch<M extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any> extends IDialogRootMatch<M> {
    dialogData: IDialogData<DIALOGDATA>;
    dialogStack: DialogInstance[];
    replaceThisDialog<DIALOGARGS extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS, dialogResponse?: DIALOGRESPONSE): Promise<void>;
    endThisDialog(dialogResponse?: DIALOGRESPONSE): Promise<void>;
}

export interface IDialogArgsMatch<DIALOGARGS extends object> {
    dialogArgs: DIALOGARGS;
}

export interface DialogResponder<M extends object = any, DIALOGRESPONSE extends object = any> {
    (message: M & IDialogResponderMatch<DIALOGRESPONSE>): Observableable<void>;
}

export interface IDialogResponderMatch<DIALOGRESPONSE extends object = object> {
    dialogResponse: DIALOGRESPONSE;
}

export interface XDialog<
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGDATA extends object = any,
> {
    init?: (message: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA>,
    router: IRouter<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>,
}

export interface LocalDialog<
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGDATA extends object = any,
> {
    localName: string;
    remoteName?: string;    // If defined, how it is named to the outside world, otherwise not exposed
    init: (message: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA>;
    router: IRouter<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>;
}

export interface RemoteDialog<
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
> {
    remoteUrl: string;
    localName: string;
    remoteName: string;
}

export type LocalOrRemoteDialog<
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGDATA extends object = any,
> = LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA> | RemoteDialog<M, DIALOGARGS, DIALOGRESPONSE>

const isLocalDialog = <
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGDATA extends object = any
> (localOrRemoteDialog: LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>)
: localOrRemoteDialog is LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA> =>
    (localOrRemoteDialog as any).router !== undefined;

export interface RootDialogInstance {
    get: (message: any) => Observableable<DialogInstance>;
    set: (message: any, rootDialogInstance?: DialogInstance) => Observableable<void>;
}

export interface DialogResponders<M extends object = any> {
    [name: string]: DialogResponder<M>;
}

export interface LocalDialogInstances {
    newInstance: <DIALOGDATA extends object = any>(name: string, dialogData: IDialogData<DIALOGDATA>) => Observableable<DialogInstance>,
    deleteInstance: (dialogInstance: DialogInstance) => Observableable<void>,
    getDialogData: <DIALOGDATA extends object = any>(dialogInstance: DialogInstance) => Observableable<IDialogData<DIALOGDATA>>,
    setDialogData: <DIALOGDATA extends object = any>(dialogInstance: DialogInstance, dialogData?: IDialogData<DIALOGDATA>) => Observableable<void>
}

export interface DialogTask {
    method: string;
    args?: any;
}

export interface RemoteDialogProxy<M extends object = any> {
    matchLocalToRemote?: (message: M) => Observableable<any>,
    matchRemoteToLocal?: (message: any, tasks: DialogTask[]) => Observableable<M>,
    executeTask?: (message: M, tasks: DialogTask) => Observableable<any>,
}

export interface RemoteActivateRequest {
    method: 'activate';
    name: string;
    message: any;
    args: any;
}

export type RemoteActivateResponse = {
    status: 'success';
    instance: string;
    tasks: any[];
} | {
    status: 'error';
    error: string;
}

export interface RemoteTryMatchRequest {
    method: 'tryMatch';
    name: string;
    instance: string;
    message: any;
}

export type RemoteTryMatchResponse = {
    status: 'match';
    tasks: DialogTask[];
} | {
    status: 'matchless';
} | {
    status: 'error';
    error: string;
}

export type RemoteRequest = RemoteActivateRequest | RemoteTryMatchRequest;

export type RemoteResponse = RemoteActivateResponse | RemoteTryMatchResponse;

export class Dialogs<M extends object = any> {
    private dialogs: DialogRegistry<M> = {}

    constructor(
        private rootDialogInstance: RootDialogInstance,
        private localDialogInstances: LocalDialogInstances,
        private remoteDialogProxy: RemoteDialogProxy<M>,
    ) {
    }

    runChildIfActive<
        ANYMATCH extends object = M,
        DIALOGRESPONSE extends object = any
    >(
        dialogOrName?: LocalOrRemoteDialog<M, any, DIALOGRESPONSE> | string,
        dialogResponder: DialogResponder<ANYMATCH, DIALOGRESPONSE> = () => {}
    ): IRouter<ANYMATCH> {
        return {
            getRoute: (message: ANYMATCH & IDialogMatch<ANYMATCH>) => {

                konsole.log("runChildIfActive", message);

                let odi: Observable<DialogInstance>;
                if (message.dialogStack) {
                    if (!message.dialogData.childDialogInstance)
                        return;
                    odi = Observable.of(message.dialogData.childDialogInstance);
                } else {
                    // This is being run from the "root" (a non-dialog router)
                    message = {
                        ... message as any,
                        dialogStack: [],
                    }
                    odi = toFilteredObservable(this.rootDialogInstance.get(message));
                }

                konsole.log("runChildIfActive (active)", message);

                return odi
                    .flatMap(dialogInstance => {
                        const dialog = this.dialogs[dialogInstance.name];

                        if (!dialog) {
                            konsole.warn(`The stack references a dialog named "${dialogInstance.name}", which doesn't exist.`);
                            return Observable.empty<Route>();
                        }

                        // if a dialog is provided, only run that one
                        if (dialogOrName && this.dialogize(dialogOrName) !== dialog)
                            return Observable.empty<Route>();

                        return this.tryMatch(dialog, message as any, dialogInstance, dialogResponder as any);
                    });
            }
        } as IRouter<ANYMATCH>;
    }

    matchRootDialog(message: M): M & IDialogRootMatch<M> {
        return {
            ... message as any,
            beginChildDialog: <DIALOGARGS extends object = any>(dialog: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS) =>
                this.activate(dialog, message, dialogArgs)
                    .flatMap(dialogInstance => toObservable(this.rootDialogInstance.set(message, dialogInstance)))
                    .toPromise(),
            clearChildDialog: () => toObservable(this.rootDialogInstance.set(message)).toPromise()
        }
    }

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteName: string,
        dialog: XDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteable: boolean,
        dialog: XDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        dialog: XDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteName: string,
        init: (message: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA>,
        router: IRouter<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteable: boolean,
        init: (message: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA>,
        router: IRouter<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        init: (message: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA>,
        router: IRouter<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteName: string,
        router: IRouter<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteable: boolean,
        router: IRouter<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        router: IRouter<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any>(
        localName: string,
        remoteUrl: string,
    ): RemoteDialog<M, DIALOGARGS, DIALOGRESPONSE>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any>(
        localName: string,
        remoteUrl: string,
        remoteName: string
    ): RemoteDialog<M, DIALOGARGS, DIALOGRESPONSE>;

    add(... args: any[]) {

        const localName: string = args[0];
        let dialog: LocalOrRemoteDialog;

        if (typeof args[1] === 'string' && (args.length === 2 || (args.length === 3 && typeof args[2] === 'string'))) {
            // remote dialog
            dialog = {
                localName,
                remoteUrl: args[1],
                remoteName: (args.length === 3 && args[2]) || localName
            }
        } else {
            // local dialog
            let remoteName: string;
            let init = () => ({});
            let router;
            let dialogIndex = 2;

            if (typeof args[1] === 'string') {
                remoteName = args[1];
            } else if (typeof args[1] === 'boolean') {
                if (args[1] === true)
                    remoteName = localName;
            } else {
                dialogIndex = 1;
            }

            if (args.length === dialogIndex + 2) {
                // init + router
                init = args[dialogIndex];
                router = args[dialogIndex + 1];
            } else if (args[dialogIndex].router) {
                // XDialog
                init = args[dialogIndex].init;
                router = args[dialogIndex].router;
            } else {
                // just router (use default init)
                router = args[dialogIndex];
            }

            dialog = {
                localName,
                remoteName,
                init,
                router: routerize(router),
            }
        }

        if (this.dialogs[localName]) {
            console.warn(`You attempted to add a dialog named "${localName}" but a dialog with that name already exists.`);
            return;
        }

        this.dialogs[localName] = dialog;

        return dialog;
    }

    private dialogize(dialogOrName: LocalOrRemoteDialog<M> | string): LocalOrRemoteDialog<M> {
        if (typeof dialogOrName !== 'string')
            return dialogOrName;

        const dialogT = this.dialogs[dialogOrName];
        if (dialogT)
            return dialogT;
        
        console.warn(`You referenced a dialog named "${dialogOrName}" but no such dialog exists.`)
    }

    private nameize(dialogOrName: LocalOrRemoteDialog<M> | string): string {
        return typeof dialogOrName === 'string'
            ? dialogOrName
            : dialogOrName.localName;
    }

    // called three ways:
    // * by local code, to activate local dialog 
    // * by local code, to activate remote proxy
    // * by remote proxy, to activate local dialog

    private activate<
        DIALOGARGS extends object = any
    >(
        dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS> | string,
        message: M,
        dialogArgs?: DIALOGARGS
    ): Observable<DialogInstance> {

        const dialog: LocalOrRemoteDialog<M, DIALOGARGS> = this.dialogize(dialogOrName);

        if (isLocalDialog(dialog)) {
            return toObservable(dialog.init({
                    ... message as any,
                    dialogArgs
                }))
                    .flatMap(dialogData => toObservable(this.localDialogInstances.newInstance(dialog.localName, dialogData)));
        } else {
            return toObservable(this.matchLocalToRemote(message as any)) // TYPE CHECK
                .flatMap(message =>
                    fetch(
                        dialog.remoteUrl,
                        {
                            method: 'POST',
                            headers: new Headers({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({
                                method: 'activate',
                                name: dialog.remoteName,
                                args: dialogArgs,
                                message
                            } as RemoteActivateRequest)
                        }
                    )
                    .then(response => response.json() as Promise<RemoteActivateResponse>)
                )
                .flatMap(response => {
                    if (response.status === 'error')
                        return Observable.throw(`RemoteDialog.activate returned error "${response.error}".`);

                    if (response.status !== 'success')
                        return Observable.throw(`RemoteDialog.activate returned unexpected status "${(response as any).status}".`);

                    return toObservable(this.executeTasks(message as any, response.tasks)) // TYPE CHECK
                        .map(_ => ({
                            name: dialog.localName,
                            instance: response.instance
                        } as DialogInstance));
                });
        }
    }

    // called three ways:
    // * by local code, to run local dialog 
    // * by local code, to run remote proxy
    // * by remote proxy, to run local dialog

    private tryMatch<
        DIALOGARGS extends object = any,
        DIALOGRESPONSE extends object = any,
        DIALOGDATA extends object = any
    >(
        dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA> | string,
        message: M & IDialogMatch<DIALOGRESPONSE>,
        dialogInstance: DialogInstance,
        dialogResponder: DialogResponder<M, DIALOGRESPONSE>
    ) : Observable<Route> {

        const dialog: LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA> = this.dialogize(dialogOrName);

        if (isLocalDialog(dialog)) {
            konsole.log("tryMatch local", message);
            return toObservable(this.localDialogInstances.getDialogData<DIALOGDATA>(dialogInstance))
                .flatMap(dialogData =>
                    dialog.router.getRoute({
                        ... message as any,

                        dialogData,
                        dialogStack: [... message.dialogStack, dialogInstance],

                        beginChildDialog: <DIALOGARGS extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS) =>
                            this.activate(dialogOrName, message, dialogArgs)
                                .do(dialogInstance => message.dialogData.childDialogInstance = dialogInstance)
                                .toPromise(),
                        clearChildDialog: () => new Promise<void>((resolve) => {
                            dialogData.childDialogInstance = undefined;
                            resolve();
                        }),
                        replaceThisDialog: <DIALOGARGS extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE> | string, dialogArgs?: DIALOGARGS, dialogResponse?: DIALOGRESPONSE) =>
                            toObservable(dialogResponder({
                                ... message as any,
                                dialogResponse
                            }))
                                .toPromise()
                                .then(() => message.beginChildDialog(dialogOrName as any, dialogArgs)), // TYPE CHECK
                        endThisDialog: (dialogResponse?: DIALOGRESPONSE) =>
                            toObservable(dialogResponder({
                                ... message as any,
                                dialogResponse
                            }))
                                .toPromise()
                                .then(() => message.clearChildDialog()),
                    })
                    .map(ruleResult => ({
                        ... ruleResult,
                        action: () => toObservable(ruleResult.action())
                            .flatMap(_ => toObservable(this.localDialogInstances.setDialogData(dialogInstance, dialogData)))
                    } as Route))
                )
        } else {
            konsole.log("tryMatch remote", message);
            return toObservable(this.matchLocalToRemote(message))
                .do(message => konsole.log("matchLocalToRemote", message))
                .flatMap(message =>
                    fetch(
                        dialog.remoteUrl,
                        {
                            method: 'POST',
                            headers: new Headers({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({
                                method: 'tryMatch',
                                name: dialog.remoteName,
                                instance: dialogInstance.instance,
                                message
                            })
                        }
                    )
                    .then(response => response.json() as Promise<RemoteTryMatchResponse>)
                )
                .flatMap<RemoteTryMatchResponse, Route>(response => {
                    if (response.status === 'error')
                        return Observable.throw(`RemoteDialog.tryMatch returned error "${response.error}".`);

                    if (response.status === 'matchless')
                        return Observable.empty<Route>();

                    if (response.status !== 'match')
                        return Observable.throw(`RemoteDialog.tryMatch returned unexpected status "${(response as any).status}".`);

                    return Observable.of({
                        action: () => this.executeTasks(message, response.tasks, dialogResponder)
                    } as Route);
                })
        }
    }

    // These methods are used to serve up local dialogs remotely

    remoteActivate(name: string, remoteMatch: any, dialogArgs: any): Observable<RemoteActivateResponse> {
        const tasks: DialogTask[] = [];

        return this.activate(
            name,
            this.matchRemoteToLocal(remoteMatch, tasks),
            dialogArgs
        )
            .map(dialogInstance => ({
                status: 'success',
                instance: dialogInstance.instance,
                tasks
            } as RemoteActivateResponse))
            .catch(error => Observable.of({
                status: 'error',
                error
            } as RemoteActivateResponse));
    }

    private matchLocalToRemote(message: M & IDialogMatch): any {
        return {
            ... this.remoteDialogProxy.matchLocalToRemote(message),
            dialogStack: message.dialogStack,
        }
    }

    private matchRemoteToLocal(message: any, tasks: DialogTask[]) {
        return {
            ... this.remoteDialogProxy.matchRemoteToLocal(message, tasks) as any,
            dialogStack: message.dialogStack as DialogInstance[],
        } as M & IDialogMatch
    }

    private executeTasks(
        message: M & IDialogRootMatch,
        tasks: DialogTask[],
        dialogResponder?: DialogResponder<M>
    ): Observable<void> {
        return Observable.from(tasks)
            .flatMap(task => {
                switch (task.method) {
                    case 'beginChildDialog':
                        return message.beginChildDialog(task.args.name, task.args.args);
                    case 'clearChildDialog':
                        return message.clearChildDialog();
                    case 'responder':
                        return dialogResponder
                            ? toObservable(dialogResponder(task.args.response))
                            : Observable.empty();
                    default:
                        return toObservable(this.remoteDialogProxy.executeTask(message, task));
                }
            });
    }

    remoteTryMatch(name: string, instance: string, remoteMatch: any): Observable<RemoteTryMatchResponse> {
        const tasks: DialogTask[] = [];

        const message: M & IDialogMatch = {
            ... this.matchRemoteToLocal(remoteMatch, tasks) as any,
            beginChildDialog: (dialogOrName: LocalOrRemoteDialog<M> | string, dialogArgs?: any) =>
                // will only be called by replaceThisDialog
                new Promise<void>((resolve) => {
                    tasks.push({
                        method: 'beginChildDialog',
                        args: {
                            name: this.nameize(dialogOrName),
                            args: dialogArgs
                        }
                    });
                    resolve();
                }),

            clearChildDialog: () =>
                // will only be called by endThisDialog
                new Promise<void>((resolve) => {
                    tasks.push({
                        method: 'clearChildDialog'
                    });
                    resolve();
                }),
        };

        konsole.log("remoteTryMatch", message);

        const dialogResponder = (message: M & IDialogResponderMatch) => {
            tasks.push({
                method: 'responder',
                args: {
                    response: message.dialogResponse
                }
            })
        }

        return this.tryMatch(name, message, { name, instance }, dialogResponder)
            .do(ruleResult => konsole.log("ruleResult", ruleResult))
            // add a sentinal value so that we can detect an empty sequence
            .concat(Observable.of(-1))
            // taking the first element gives us the result of tryMatch if there is one, the sentinal value otherwise
            .take(1)
            // testing the type of the result (instead of the value) lets TypeScript resolve the type ambiguity
            .flatMap(ruleResultOrSentinal => typeof ruleResultOrSentinal === 'number'
                ? Observable.of({
                        status: 'matchless'
                    } as RemoteTryMatchResponse)
                : toObservable(ruleResultOrSentinal.action())
                    .map(_ => ({
                        status: 'match',
                        tasks
                    } as RemoteTryMatchResponse))
            )
            .catch(error => Observable.of({
                status: 'error',
                error
            } as RemoteTryMatchResponse));
    }
}
