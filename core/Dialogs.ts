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

export interface IDialogResponseHandlerMatch<DIALOGRESPONSE extends object = object> {
    dialogResponse: DIALOGRESPONSE;
}

export interface DialogResponseHandler<M extends object = any, DIALOGRESPONSE extends object = any> {
    (message: M & IDialogResponseHandlerMatch<DIALOGRESPONSE>): Observableable<void>;
}

export interface IDialog<
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

export interface DialogResponseHandlers<M extends object = any> {
    [name: string]: DialogResponseHandler<M>;
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

export const nameize = (dialogOrName: LocalOrRemoteDialog | string): string =>
    typeof dialogOrName === 'string'
        ? dialogOrName
        : dialogOrName.localName;

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

    private dialogize(dialogOrName: LocalOrRemoteDialog<M> | string): LocalOrRemoteDialog<M> {
        if (typeof dialogOrName !== 'string')
            return dialogOrName;

        const dialog = this.dialogs[dialogOrName];
        if (dialog)
            return dialog;
        
        console.warn(`You referenced a dialog named "${dialogOrName}" but no such dialog exists.`)
    }

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteName: string,
        dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteable: boolean,
        dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>
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

    add() {

        const localName: string = arguments[0];
        let dialog: LocalOrRemoteDialog;

        if (typeof arguments[1] === 'string' && (arguments.length === 2 || (arguments.length === 3 && typeof arguments[2] === 'string'))) {
            // remote dialog
            dialog = {
                localName,
                remoteUrl: arguments[1],
                remoteName: (arguments.length === 3 && arguments[2]) || localName
            }
        } else {
            // local dialog
            let remoteName: string;
            let init = () => ({});
            let router;
            let dialogIndex = 2;

            if (typeof arguments[1] === 'string') {
                remoteName = arguments[1];
            } else if (typeof arguments[1] === 'boolean') {
                if (arguments[1] === true)
                    remoteName = localName;
            } else {
                dialogIndex = 1;
            }

            if (arguments.length === dialogIndex + 2) {
                // init + router
                init = arguments[dialogIndex];
                router = arguments[dialogIndex + 1];
            } else if (arguments[dialogIndex].router) {
                // XDialog
                init = arguments[dialogIndex].init;
                router = arguments[dialogIndex].router;
            } else {
                // just router (use default init)
                router = arguments[dialogIndex];
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

    getRouteFromDialogInstance<ANYMATCH extends object = any, DIALOGRESPONSE extends object = any>(
        dialog: LocalOrRemoteDialog<ANYMATCH, any, DIALOGRESPONSE>,
        dialogInstance: DialogInstance,
        m: ANYMATCH,
        dialogResponseHandler?: DialogResponseHandler<ANYMATCH, DIALOGRESPONSE>
    ): Observable<Route>;

    getRouteFromDialogInstance<ANYMATCH extends object = any>(
        dialogName: string,
        dialogInstance: DialogInstance,
        m: ANYMATCH,
        dialogResponseHandler?: DialogResponseHandler<ANYMATCH>
    ): Observable<Route>;

    getRouteFromDialogInstance<ANYMATCH extends object = any>(
        dialogInstance: DialogInstance,
        m: ANYMATCH,
        dialogResponseHandler?: DialogResponseHandler<ANYMATCH>
    ): Observable<Route>;

    getRouteFromDialogInstance(): Observable<Route> {

        const i = (arguments[0] as any).instance ? 0: 1;

        const dialogInstance = arguments[i];

        // A small optimization - if the provided DialogInstance is null or undefined, no match but also no error
        // This allows the developer to use a variable initialized to undefined
        if (!dialogInstance)
            return;

        const m = arguments[i + 1]
        const dialogResponseHandler: DialogResponseHandler = arguments[i + 2] || (() => {});

        const dialog = this.dialogs[dialogInstance.name];

        if (!dialog) {
            konsole.warn(`An attempt was made to route to a dialog named "${dialogInstance.name}", which doesn't exist.`);
            return;
        }

        if (i === 1) {
            const name = nameize(arguments[0]);
            if (name !== dialogInstance.name) {
                konsole.warn(`An attempt was made to route to a dialog named "${name}", which doesn't match the name of the dialog instance provided (${dialogInstance.name}).`);
                return;
            }
        }

        if (isLocalDialog(dialog)) {
            konsole.log("getRouteFromDialogInstance local", m);
            return toObservable(this.localDialogInstances.getDialogData(dialogInstance))
                .flatMap(dialogData =>
                    dialog.router.getRoute({
                        ... m,
                        dialogData,
                        })
                    .map(route => ({
                        ... route,
                        action: () => toObservable(route.action())
                            .flatMap(_ => toObservable(this.localDialogInstances.setDialogData(dialogInstance, dialogData)))
                    } as Route))
                )
        } else {
            konsole.log("getRouteFromDialogInstance remote", m);
            return toObservable(this.matchLocalToRemote(m))
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
                    .then(response => response.json())
                )
                .flatMap<RemoteTryMatchResponse, Route>(response => {
                    if (response.status === 'error')
                        return Observable.throw(`RemoteDialog.tryMatch returned error "${response.error}".`);

                    if (response.status === 'matchless')
                        return Observable.empty<Route>();

                    if (response.status !== 'match')
                        return Observable.throw(`RemoteDialog.tryMatch returned unexpected status "${(response as any).status}".`);

                    return Observable.of({
                        action: () => this.executeTasks(m, response.tasks, dialogResponseHandler)
                    } as Route);
                })
        }
    }

    //         if (isLocalDialog(dialog)) {
    //         konsole.log("tryMatch local", m);
    //         return toObservable(this.localDialogInstances.getDialogData<DIALOGDATA>(dialogInstance))
    //             .flatMap(dialogData =>
    //                 dialog.router.getRoute({
    //                     ... m as any,

    //                     dialogData,
    //                     dialogStack: [... m.dialogStack, dialogInstance],

    //                     beginChildDialog: <DIALOGARGS extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS) =>
    //                         this.activate(dialogOrName, m, dialogArgs)
    //                             .do(dialogInstance => m.dialogData.childDialogInstance = dialogInstance)
    //                             .toPromise(),
    //                     clearChildDialog: () => new Promise<void>((resolve) => {
    //                         dialogData.childDialogInstance = undefined;
    //                         resolve();
    //                     }),
    //                     replaceThisDialog: <DIALOGARGS extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE> | string, dialogArgs?: DIALOGARGS, dialogResponse?: DIALOGRESPONSE) =>
    //                         toObservable(dialogResponseHandler({
    //                             ... m as any,
    //                             dialogResponse
    //                         }))
    //                             .toPromise()
    //                             .then(() => m.beginChildDialog(dialogOrName as any, dialogArgs)), // TYPE CHECK
    //                     endThisDialog: (dialogResponse?: DIALOGRESPONSE) =>
    //                         toObservable(dialogResponseHandler({
    //                             ... m as any,
    //                             dialogResponse
    //                         }))
    //                             .toPromise()
    //                             .then(() => m.clearChildDialog()),
    //                 })
    //                 .map(ruleResult => ({
    //                     ... ruleResult,
    //                     action: () => toObservable(ruleResult.action())
    //                         .flatMap(_ => toObservable(this.localDialogInstances.setDialogData(dialogInstance, dialogData)))
    //                 } as Route))
    //             )
    //     } else {
    //         konsole.log("tryMatch remote", m);
    //         return toObservable(this.matchLocalToRemote(m))
    //             .do(message => konsole.log("matchLocalToRemote", message))
    //             .flatMap(message =>
    //                 fetch(
    //                     dialog.remoteUrl,
    //                     {
    //                         method: 'POST',
    //                         headers: new Headers({ 'Content-Type': 'application/json' }),
    //                         body: JSON.stringify({
    //                             method: 'tryMatch',
    //                             name: dialog.remoteName,
    //                             instance: dialogInstance.instance,
    //                             message
    //                         })
    //                     }
    //                 )
    //                 .then(response => response.json() as Promise<RemoteTryMatchResponse>)
    //             )
    //             .flatMap<RemoteTryMatchResponse, Route>(response => {
    //                 if (response.status === 'error')
    //                     return Observable.throw(`RemoteDialog.tryMatch returned error "${response.error}".`);

    //                 if (response.status === 'matchless')
    //                     return Observable.empty<Route>();

    //                 if (response.status !== 'match')
    //                     return Observable.throw(`RemoteDialog.tryMatch returned unexpected status "${(response as any).status}".`);

    //                 return Observable.of({
    //                     action: () => this.executeTasks(m, response.tasks, dialogResponseHandler)
    //                 } as Route);
    //             })
    //     }
    // }

    private createDialogInstance<
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

    // These methods are used to serve up local dialogs remotely

    remoteActivate(name: string, remoteMatch: any, dialogArgs: any): Observable<RemoteActivateResponse> {
        const tasks: DialogTask[] = [];

        return this.createDialogInstance(
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
        dialogResponseHandler?: DialogResponseHandler<M>
    ): Observable<void> {
        return Observable.from(tasks)
            .flatMap(task => {
                switch (task.method) {
                    case 'beginChildDialog':
                        return message.beginChildDialog(task.args.name, task.args.args);
                    case 'clearChildDialog':
                        return message.clearChildDialog();
                    case 'handleResponse':
                        return dialogResponseHandler
                            ? toObservable(dialogResponseHandler(task.args.response))
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
                            name: nameize(dialogOrName),
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

        const dialogResponseHandler = (message: M & IDialogResponseHandlerMatch) => {
            tasks.push({
                method: 'handleResponse',
                args: {
                    response: message.dialogResponse
                }
            })
        }

        return this.getRouteFromDialogInstance(name, { name, instance }, message, dialogResponseHandler)
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


// Child dialogs


    // runChildIfActive<
    //     ANYMATCH extends object = M,
    //     DIALOGRESPONSE extends object = any
    // >(
    //     dialogOrName?: LocalOrRemoteDialog<M, any, DIALOGRESPONSE> | string,
    //     dialogResponseHandler: DialogResponseHandler<ANYMATCH, DIALOGRESPONSE> = () => {}
    // ): IRouter<ANYMATCH> {
    //     return {
    //         getRoute: (message: ANYMATCH & IDialogMatch<ANYMATCH>) => {

    //             konsole.log("runChildIfActive", message);

    //             let odi: Observable<DialogInstance>;
    //             if (message.dialogStack) {
    //                 if (!message.dialogData.childDialogInstance)
    //                     return;
    //                 odi = Observable.of(message.dialogData.childDialogInstance);
    //             } else {
    //                 // This is being run from the "root" (a non-dialog router)
    //                 message = {
    //                     ... message as any,
    //                     dialogStack: [],
    //                 }
    //                 odi = toFilteredObservable(this.rootDialogInstance.get(message));
    //             }

    //             konsole.log("runChildIfActive (active)", message);

    //             return odi
    //                 .flatMap(dialogInstance => {
    //                     const dialog = this.dialogs[dialogInstance.name];

    //                     if (!dialog) {
    //                         konsole.warn(`The stack references a dialog named "${dialogInstance.name}", which doesn't exist.`);
    //                         return Observable.empty<Route>();
    //                     }

    //                     // if a dialog is provided, only run that one
    //                     if (dialogOrName && this.dialogize(dialogOrName) !== dialog)
    //                         return Observable.empty<Route>();

    //                     return this.getRoute(dialog, message as any, dialogInstance, dialogResponseHandler as any);
    //                 });
    //         }
    //     } as IRouter<ANYMATCH>;
    // }

    // matchRootDialog(message: M): M & IDialogRootMatch<M> {
    //     return {
    //         ... message as any,
    //         beginChildDialog: <DIALOGARGS extends object = any>(dialog: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS) =>
    //             this.activate(dialog, message, dialogArgs)
    //                 .flatMap(dialogInstance => toObservable(this.rootDialogInstance.set(message, dialogInstance)))
    //                 .toPromise(),
    //         clearChildDialog: () => toObservable(this.rootDialogInstance.set(message)).toPromise()
    //     }
    // }



