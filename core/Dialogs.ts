import { Router, RouterOrHandler, Predicate, Matcher, tryMatch, toRouter, Route, Observableable, toObservable, toFilteredObservable, first, nullRouter } from './Router';
import { Observable } from 'rxjs';
import { konsole } from './Konsole';

export interface DialogInstance {
    name: string;
    instanceId: string;
}

export interface IDialogResponseHandlerMatch<DIALOGRESPONSE extends object = object> {
    readonly dialogResponse: DIALOGRESPONSE;
}

export interface DialogResponseHandler <M extends object = {}, DIALOGRESPONSE extends object = {}> {
    (message: M & IDialogResponseHandlerMatch<DIALOGRESPONSE>): Observableable<void>;
}

export interface DialogState <DIALOGSTATE extends object = {}> {
    state: DIALOGSTATE,
    activeDialogs: {
        [name: string]: DialogInstance;
    }
}

export interface DialogConstructorHelper <
    M extends object = {},
    DIALOGARGS extends object = {},
    DIALOGRESPONSE extends object = {},
    DIALOGSTATE extends object = {}
> {
    readonly args: DIALOGARGS;
    state: DIALOGSTATE;
    routeMessage(m: M): void;
    end(dialogResponse?: DIALOGRESPONSE): void;
}

export interface DialogRouterHelper <
    M extends object = {},
    DIALOGRESPONSE extends object = {},
    DIALOGSTATE extends object = {},
> {
    state: DIALOGSTATE;

    // core        

    createInstance <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>,
        dialogArgs?: DIALOGARGS,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Promise<DialogInstance>;

    // destroyInstance(
    //     dialogInstance: DialogInstance
    // ): Promise<void>;

    routeToInstance <DIALOGRESPONSE extends object = {}> (
        dialogInstance: DialogInstance,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Router<M>;

    // Use this signature if you want to infer the typing of the dialog
    routeToInstance <DIALOGRESPONSE extends object = {}> (
        dialog: LocalOrRemoteDialog<M, any, DIALOGRESPONSE>,
        dialogInstance: DialogInstance,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Router<M>;

    // first<M extends object> (... routersOrHandlers: (RouterOrHandler<M>)[]): IRouter<M>;

    // call this from within a dialog to signal its end and (optionally) pass a response to the dialog response handler
    end(
        dialogResponse?: DIALOGRESPONSE
    ): Promise<void>;

    // activation

    activate <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS, DIALOGRESPONSE>,
        args?: DIALOGARGS,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Promise<void>;

    activate <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS, DIALOGRESPONSE>,
        instanceTag: string,
        args?: DIALOGARGS,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Promise<void>;

    deactivate(
        dialogOrName: DialogOrName<M>
    ): void;

    isActive(
        dialogOrName: DialogOrName<M>
    ): boolean;

    routeToActive <DIALOGRESPONSE extends object = {}> (
        dialogOrName: DialogOrName<M, any, DIALOGRESPONSE>,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Router<M>;

    routeToActive <DIALOGRESPONSE extends object = {}> (
        dialogOrName: DialogOrName<M, any, DIALOGRESPONSE>,
        instanceTag: string,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Router<M>;

    // "just works"

    routeTo <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}, N extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS, DIALOGRESPONSE>,
        trigger: Matcher<M, N>,
        args?: DIALOGARGS | ((n: N) => Observableable<DIALOGARGS>),
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Router<M>;

    routeTo <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS, DIALOGRESPONSE>,
        trigger: Predicate<M>,
        args?: DIALOGARGS | ((m: M) => Observableable<DIALOGARGS>),
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Router<M>;

    routeTo <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS, DIALOGRESPONSE>,
        args?: DIALOGARGS,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Router<M>;

    routeTo <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}, N extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS, DIALOGRESPONSE>,
        instanceTag: string,
        trigger: Matcher<M, N>,
        args?: DIALOGARGS | ((n: N) => Observableable<DIALOGARGS>),
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Router<M>;

    routeTo <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS, DIALOGRESPONSE>,
        instanceTag: string,
        trigger: Predicate<M>,
        args?: DIALOGARGS | ((m: M) => Observableable<DIALOGARGS>),
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Router<M>;

    routeTo <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS, DIALOGRESPONSE>,
        instanceTag: string,
        args?: DIALOGARGS,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Router<M>;

}

export interface DialogConstructor <
    M extends object,
    DIALOGARGS extends object = {},
    DIALOGRESPONSE extends object = {},
    DIALOGSTATE extends object = {}
> {
    (dialog: DialogConstructorHelper<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>, message: M): Observableable<void>;
}

export interface DialogRouter <
    M extends object,
    DIALOGRESPONSE extends object = {},
    DIALOGSTATE extends object = {}
> {
    (dialog: DialogRouterHelper<M, DIALOGRESPONSE, DIALOGSTATE>): Router<M>;
}

export interface DialogRouterOrHandler <
    M extends object = {},
    DIALOGRESPONSE extends object = {},
    DIALOGSTATE extends object = {}
> {
    (dialog: DialogRouterHelper<M, DIALOGRESPONSE, DIALOGSTATE>): RouterOrHandler<M>;
}

export interface DialogTrigger <
    M extends object = {},
    DIALOGARGS extends object = {}
> {
    (m: M): Observableable<Partial<DIALOGARGS>>;
}

export interface IDialog <
    M extends object,
    DIALOGARGS extends object = {},
    DIALOGRESPONSE extends object = {},
    DIALOGSTATE extends object = {},
> {
    constructor?: DialogConstructor<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>,
    router?: DialogRouterOrHandler<M, DIALOGRESPONSE, DIALOGSTATE>,
    trigger?: DialogTrigger<M, DIALOGARGS>,
}

export interface LocalDialog <
    M extends object,
    DIALOGARGS extends object = {},
    DIALOGRESPONSE extends object = {},
    DIALOGSTATE extends object = {},
> {
    localName: string;
    remoteName: string;    // How it is named to the outside world (might be same as localName)
    constructor: DialogConstructor<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;
    router: DialogRouter<M, DIALOGRESPONSE, DIALOGSTATE>;
    trigger: DialogTrigger<M, DIALOGARGS>
}

export interface RemoteDialog <
    M extends object,
    DIALOGARGS extends object = {},
    DIALOGRESPONSE extends object = {},
> {
    remoteUrl: string;
    localName: string;
    remoteName: string;
}

export type LocalOrRemoteDialog <
    M extends object = {},
    DIALOGARGS extends object = {},
    DIALOGRESPONSE extends object = {},
    DIALOGSTATE extends object = {},
> = LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE> | RemoteDialog<M, DIALOGARGS, DIALOGRESPONSE>

const isLocalDialog = <
    M extends object,
    DIALOGARGS extends object = {},
    DIALOGRESPONSE extends object = {},
    DIALOGSTATE extends object = {}
> (localOrRemoteDialog: LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>)
: localOrRemoteDialog is LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE> =>
    (localOrRemoteDialog as any).router !== undefined;

export type DialogOrName <
    M extends object = {},
    DIALOGARGS extends object = {},
    DIALOGRESPONSE extends object = {},
    DIALOGSTATE extends object = {},
> = LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE> | string;

export const toLocalName = (dialogOrName: DialogOrName): string =>
    typeof dialogOrName === 'string'
        ? dialogOrName
        : dialogOrName.localName;

export interface RootDialogInstance {
    get: (message: object) => Observableable<DialogInstance>;
    set: (message: object, rootDialogInstance?: DialogInstance) => Observableable<void>;
}

export interface LocalDialogInstances {
    createInstance: (name: string, dialogState?: object) => Observableable<DialogInstance>,
    destroyInstance: (dialogInstance: DialogInstance) => Observableable<void>,
    getDialogState: (dialogInstance: DialogInstance) => Observableable<any>,
    setDialogState: (dialogInstance: DialogInstance, dialogState?: object) => Observableable<void>
}

// export interface DialogTask {
//     method: string;
//     args?: object;
// }

// export interface RemoteDialogProxy<M extends object> {
//     matchLocalToRemote?: (message: M) => Observableable<any>,
//     matchRemoteToLocal?: (message: object, tasks: DialogTask[]) => Observableable<M>,
//     executeTask?: (message: M, tasks: DialogTask) => Observableable<any>,
// }

// export interface RemoteActivateRequest {
//     method: 'activate';
//     name: string;
//     message: object;
//     args: object;
// }

// export type RemoteActivateResponse = {
//     status: 'success';
//     instance: string;
//     tasks: object[];
// } | {
//     status: 'error';
//     error: string;
// }

// export interface RemoteTryMatchRequest {
//     method: 'tryMatch';
//     name: string;
//     instance: string;
//     message: object;
// }

// export type RemoteTryMatchResponse = {
//     status: 'match';
//     tasks: DialogTask[];
// } | {
//     status: 'matchless';
// } | {
//     status: 'error';
//     error: string;
// }

// export type RemoteRequest = RemoteActivateRequest | RemoteTryMatchRequest;

// export type RemoteResponse = RemoteActivateResponse | RemoteTryMatchResponse;

// default in-memory storage for dialog instances
const dialogInstances: {
    [name: string]: object[];
} = {};

export const inMemoryDialogInstances: LocalDialogInstances = {
    createInstance: (name, dialogData = {}) => {
        if (!dialogInstances[name])
            dialogInstances[name] = [];
        return {
            name,
            instanceId: (dialogInstances[name].push(dialogData) - 1).toString()
        };
    },
    destroyInstance: (dialogInstance) => {
        delete dialogInstances[dialogInstance.name][dialogInstance.instanceId];
        if (dialogInstances[dialogInstance.name].length === 0)
            delete dialogInstances[dialogInstance.name];
    },
    getDialogState: (dialogInstance) => ({ ... dialogInstances[dialogInstance.name][dialogInstance.instanceId] }),
    setDialogState: (dialogInstance, dialogData?) => {
        dialogInstances[dialogInstance.name][dialogInstance.instanceId] = dialogData;
    }
}

export class Dialogs <M extends object> {

    private dialogRegistry: {
        [name: string]: LocalOrRemoteDialog<M>;
    } = {}

    constructor(
        private rootDialogInstance: RootDialogInstance,
        private localDialogInstances: LocalDialogInstances = inMemoryDialogInstances,
        // private remoteDialogProxy: RemoteDialogProxy<M>,
    ) {
    }

    private toLocalOrRemoteDialog<DIALOGARGS extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS>
    ): LocalOrRemoteDialog<M, DIALOGARGS> {
        if (typeof dialogOrName !== 'string')
            return dialogOrName;

        const localOrRemoteDialog = this.dialogRegistry[dialogOrName];
        if (localOrRemoteDialog)
            return localOrRemoteDialog;

        console.warn(`You referenced a dialog named "${dialogOrName}" but no such dialog exists.`)
    }

    add <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}, DIALOGSTATE extends object = {}> (
        localName: string,
        dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    add <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}, DIALOGSTATE extends object = {}> (
        localName: string,
        remoteName: string,
        dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    add <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}, DIALOGSTATE extends object = {}> (
        localName: string,
        remoteable: boolean,
        dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    // add <DIALOGARGS extends object = {}, DIALOGRESPONSE extends object = {}> (
    //     localName: string,
    //     remoteUrl: string,
    //     remoteName?: string
    // ): RemoteDialog<M, DIALOGARGS, DIALOGRESPONSE>;

    add (
        localName: string,
        ... args
    ) {
        let dialog: LocalOrRemoteDialog;

        if (typeof args[0] === 'string' && (args.length === 1 || (args.length === 2 && typeof args[1] === 'string'))) {
            // remote dialog
            dialog = {
                localName,
                remoteUrl: args[0],
                remoteName: (args.length === 2 && args[1]) || localName
            }
        } else {
            // local dialog
            let remoteName: string;
            let idialog: IDialog<M> = args[1];

            if (typeof args[0] === 'string') {
                remoteName = args[0];
            } else if (typeof args[0] === 'boolean') {
                if (args[0] === true)
                    remoteName = localName;
            } else {
                idialog = args[0]
            }

            dialog = {
                localName,
                remoteName,
                constructor: idialog.constructor || ((dialog, m) => {}),
                router: (dialog: DialogRouterHelper<M>) => idialog.router ? toRouter(idialog.router(dialog)) : nullRouter(),
                trigger: idialog.trigger || (() => ({}))
            }
        }

        if (this.dialogRegistry[localName]) {
            console.warn(`You attempted to add a dialog named "${localName}" but a dialog with that name already exists.`);
            return;
        }

        this.dialogRegistry[localName] = dialog;

        return dialog;
    }

    private createDialogInstance(
        dialogOrName: DialogOrName<M>,
        m: M,
        dialogArgs: object = {},
        dialogResponseHandler: DialogResponseHandler<M> = () => {}
    ): Observable<DialogInstance> {

        console.log("createDialogInstance", dialogOrName, m, dialogArgs, dialogResponseHandler);
        const localOrRemoteDialog = this.toLocalOrRemoteDialog(dialogOrName);
        if (!localOrRemoteDialog)
            return Observable.empty();

        if (isLocalDialog(localOrRemoteDialog)) {
            let dialogResponse;
            let messageToRoute: M;
    
            const dialogConstructorHelper: DialogConstructorHelper = {
                args: dialogArgs,
                state: {},
                end: (_dialogResponse: object) => {
                    dialogResponse = _dialogResponse || {};
                },
                routeMessage: (_messageToRoute: M) => {
                    messageToRoute = _messageToRoute;
                }
            }

            return toObservable(localOrRemoteDialog.constructor(dialogConstructorHelper, m))
                .flatMap(_ => {
                    console.log("createDialogInstance constructor response", dialogResponse, messageToRoute);
                    if (dialogResponse) {
                        // Dialog ended in constructor. Do handle the response, don't create a dialog.
                        return toObservable(dialogResponseHandler(dialogResponse))
                            .flatMap(_ => Observable.empty());
                    }

                    return toObservable(this.localDialogInstances.createInstance(localOrRemoteDialog.localName, {
                            state: dialogConstructorHelper.state,
                            activeDialogs: {}
                        } as DialogState))
                        .flatMap(dialogInstance => messageToRoute
                            ? this.getRouteFromDialogInstance(dialogInstance, messageToRoute, dialogResponseHandler,
                                    (dialogResponse) => {
                                        dialogInstance = undefined;
                                        return true;
                                    }
                                )
                                .flatMap(route =>
                                    toObservable(route.action())
                                        .map(_ => dialogInstance)
                                        .filter(dialogInstance => !!dialogInstance)
                                )
                            : Observable.of(dialogInstance)
                        )
                });
        }
        // else {
        //     return toObservable(this.matchLocalToRemote(message as any)) // TYPE CHECK
        //         .flatMap(message =>
        //             fetch(
        //                 dialog.remoteUrl,
        //                 {
        //                     method: 'POST',
        //                     headers: new Headers({ 'Content-Type': 'application/json' }),
        //                     body: JSON.stringify({
        //                         method: 'activate',
        //                         name: dialog.remoteName,
        //                         args: dialogArgs,
        //                         message
        //                     } as RemoteActivateRequest)
        //                 }
        //             )
        //             .then(response => response.json() as Promise<RemoteActivateResponse>)
        //         )
        //         .flatMap(response => {
        //             if (response.status === 'error')
        //                 return Observable.throw(`RemoteDialog.activate returned error "${response.error}".`);

        //             if (response.status !== 'success')
        //                 return Observable.throw(`RemoteDialog.activate returned unexpected status "${(response as any).status}".`);

        //             return toObservable(this.executeTasks(message as any, response.tasks)) // TYPE CHECK
        //                 .map(_ => ({
        //                     name: dialog.localName,
        //                     instanceId: response.instance
        //                 } as DialogInstance));
        //         });
        // }
    }

    private getRouteFromDialogInstance(
        dialogInstance: DialogInstance,
        m: M,
        dialogResponseHandler: DialogResponseHandler<M> = () => {},
        end: (dialogResponse?: object) => boolean = () => true,
    ): Observable<Route> {
        console.log("getRouteFromDialogInstance", dialogInstance, m, dialogResponseHandler, end); // , replace);

        // A small optimization - if the provided DialogInstance is null or undefined, no match but also no error
        // This allows the developer to use a variable initialized to undefined
        if (!dialogInstance)
            return;

        const localOrRemoteDialog = this.dialogRegistry[dialogInstance.name];

        if (!localOrRemoteDialog) {
            konsole.warn(`An attempt was made to route to a dialog named "${dialogInstance.name}", which doesn't exist.`);
            return;
        }

        if (isLocalDialog(localOrRemoteDialog)) {
            konsole.log("getRouteFromDialogInstance local", m);
            return toObservable(this.localDialogInstances.getDialogState(dialogInstance))
                .flatMap(dialogState =>
                    localOrRemoteDialog.router(this.createDialogRouterHelper(dialogInstance, m, dialogState, dialogResponseHandler, end)) // , replace))
                        .getRoute(m)
                        .map(route => ({
                            ... route,
                            action: () =>
                                toObservable(route.action())
                                    .flatMap(_ => toObservable(this.localDialogInstances.setDialogState(dialogInstance, dialogState)))
                        } as Route))
                )
        }
        // else {
        //     konsole.log("getRouteFromDialogInstance remote", m);
        //     return toObservable(this.matchLocalToRemote(m))
        //         .do(message => konsole.log("matchLocalToRemote", message))
        //         .flatMap(message =>
        //             fetch(
        //                 dialog.remoteUrl,
        //                 {
        //                     method: 'POST',
        //                     headers: new Headers({ 'Content-Type': 'application/json' }),
        //                     body: JSON.stringify({
        //                         method: 'tryMatch',
        //                         name: dialog.remoteName,
        //                         instance: dialog.InstanceId,
        //                         message
        //                     })
        //                 }
        //             )
        //             .then(response => response.json())
        //         )
        //         .flatMap<RemoteTryMatchResponse, Route> (response => {
        //             if (response.status === 'error')
        //                 return Observable.throw(`RemoteDialog.tryMatch returned error "${response.error}".`);

        //             if (response.status === 'matchless')
        //                 return Observable.empty<Route> ();

        //             if (response.status !== 'match')
        //                 return Observable.throw(`RemoteDialog.tryMatch returned unexpected status "${(response as any).status}".`);

        //             return Observable.of({
        //                 action: () => this.executeTasks(m, response.tasks, dialogResponseHandler)
        //             } as Route);
        //         })
        // }
    }

    //         if (isLocalDialog(dialog)) {
    //         konsole.log("tryMatch local", m);
    //         return toObservable(this.localDialogInstances.getDialogData<DIALOGSTATE> (dialogInstance))
    //             .flatMap(dialogState =>
    //                 dialog.router.getRoute({
    //                     ... m as any,

    //                     dialogState,
    //                     dialogStack: [... m.dialogStack, dialogInstance],

    //                     beginChildDialog: <DIALOGARGS extends object = {}> (dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS) =>
    //                         this.activate(dialogOrName, m, dialogArgs)
    //                             .do(dialogInstance => m.dialogState.childDialogInstance = dialogInstance)
    //                             .toPromise(),
    //                     clearChildDialog: () => new Promise<void> ((resolve) => {
    //                         dialogState.childDialogInstance = undefined;
    //                         resolve();
    //                     }),
    //                     replaceThisDialog: <DIALOGARGS extends object = {}> (dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE> | string, dialogArgs?: DIALOGARGS, dialogResponse?: DIALOGRESPONSE) =>
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
    //                         .flatMap(_ => toObservable(this.localDialogInstances.setDialogData(dialogInstance, dialogState)))
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
    //                             instance: dialogInstance.instanceId,
    //                             message
    //                         })
    //                     }
    //                 )
    //                 .then(response => response.json() as Promise<RemoteTryMatchResponse>)
    //             )
    //             .flatMap<RemoteTryMatchResponse, Route> (response => {
    //                 if (response.status === 'error')
    //                     return Observable.throw(`RemoteDialog.tryMatch returned error "${response.error}".`);

    //                 if (response.status === 'matchless')
    //                     return Observable.empty<Route> ();

    //                 if (response.status !== 'match')
    //                     return Observable.throw(`RemoteDialog.tryMatch returned unexpected status "${(response as any).status}".`);

    //                 return Observable.of({
    //                     action: () => this.executeTasks(m, response.tasks, dialogResponseHandler)
    //                 } as Route);
    //             })
    //     }
    // }


    // These methods are used to serve up local dialogs remotely

    // remoteActivate(name: string, remoteMatch: object, dialogArgs: object): Observable<RemoteActivateResponse> {
    //     const tasks: DialogTask[] = [];

    //     return this.createDialogInstance(
    //         name,
    //         this.matchRemoteToLocal(remoteMatch, tasks),
    //         dialogArgs
    //     )
    //         .map(dialogInstance => ({
    //             status: 'success',
    //             instance: dialogInstance.instanceId,
    //             tasks
    //         } as RemoteActivateResponse))
    //         .catch(error => Observable.of({
    //             status: 'error',
    //             error
    //         } as RemoteActivateResponse));
    // }

    // private matchLocalToRemote(message: M & IDialogMatch): object {
    //     return {
    //         ... this.remoteDialogProxy.matchLocalToRemote(message),
    //         dialogStack: message.dialogStack,
    //     }
    // }

    // private matchRemoteToLocal(message: object, tasks: DialogTask[]) {
    //     return {
    //         ... this.remoteDialogProxy.matchRemoteToLocal(message, tasks) as any,
    //         dialogStack: message.dialogStack as DialogInstance[],
    //     } as M & IDialogMatch
    // }

    // private executeTasks(
    //     message: M & IDialogRootMatch,
    //     tasks: DialogTask[],
    //     dialogResponseHandler?: DialogResponseHandler<M>
    // ): Observable<void> {
    //     return Observable.from(tasks)
    //         .flatMap(task => {
    //             switch (task.method) {
    //                 case 'beginChildDialog':
    //                     return message.beginChildDialog(task.args.name, task.args.args);
    //                 case 'clearChildDialog':
    //                     return message.clearChildDialog();
    //                 case 'handleResponse':
    //                     return dialogResponseHandler
    //                         ? toObservable(dialogResponseHandler(task.args.response))
    //                         : Observable.empty();
    //                 default:
    //                     return toObservable(this.remoteDialogProxy.executeTask(message, task));
    //             }
    //         });
    // }

    // remoteTryMatch(name: string, instance: string, remoteMatch: object): Observable<RemoteTryMatchResponse> {
    //     const tasks: DialogTask[] = [];

    //     const message: M & IDialogMatch = {
    //         ... this.matchRemoteToLocal(remoteMatch, tasks) as any,
    //         beginChildDialog: (dialogOrName: DialogOrName<M>, dialogArgs?: object) =>
    //             // will only be called by replaceThisDialog
    //             new Promise<void> ((resolve) => {
    //                 tasks.push({
    //                     method: 'beginChildDialog',
    //                     args: {
    //                         name: nameize(dialogOrName),
    //                         args: dialogArgs
    //                     }
    //                 });
    //                 resolve();
    //             }),

    //         clearChildDialog: () =>
    //             // will only be called by endThisDialog
    //             new Promise<void> ((resolve) => {
    //                 tasks.push({
    //                     method: 'clearChildDialog'
    //                 });
    //                 resolve();
    //             }),
    //     };

    //     konsole.log("remoteTryMatch", message);

    //     const dialogResponseHandler = (message: M & IDialogResponseHandlerMatch) => {
    //         tasks.push({
    //             method: 'handleResponse',
    //             args: {
    //                 response: message.dialogResponse
    //             }
    //         })
    //     }

    //     return this.getRouteFromDialogInstance(name, { name, instanceId }, message, dialogResponseHandler)
    //         .do(ruleResult => konsole.log("ruleResult", ruleResult))
    //         // add a sentinal value so that we can detect an empty sequence
    //         .concat(Observable.of(-1))
    //         // taking the first element gives us the result of tryMatch if there is one, the sentinal value otherwise
    //         .take(1)
    //         // testing the type of the result (instead of the value) lets TypeScript resolve the type ambiguity
    //         .flatMap(ruleResultOrSentinal => typeof ruleResultOrSentinal === 'number'
    //             ? Observable.of({
    //                     status: 'matchless'
    //                 } as RemoteTryMatchResponse)
    //             : toObservable(ruleResultOrSentinal.action())
    //                 .map(_ => ({
    //                     status: 'match',
    //                     tasks
    //                 } as RemoteTryMatchResponse))
    //         )
    //         .catch(error => Observable.of({
    //             status: 'error',
    //             error
    //         } as RemoteTryMatchResponse));
    // }

    setRoot <DIALOGARGS extends object = {}> (
        dialogOrName: DialogOrName<M, DIALOGARGS>,
        m: M,
        dialogArgs?: DIALOGARGS
    ) {
        console.log("setRoot", dialogOrName, m, dialogArgs);
        return toObservable(this.createDialogInstance(dialogOrName, m, dialogArgs))
            .flatMap(dialogInstance =>
                toObservable(this.rootDialogInstance.set(m, dialogInstance))
                    .map(_ => dialogInstance)
            )
            .toPromise();
    }

    routeToRoot <DIALOGARGS extends object = {}> (
        dialogOrName?: DialogOrName<M, DIALOGARGS>,
        dialogArgs?: DIALOGARGS
    ): Router<M> {
        console.log("routeToRoot", dialogOrName, dialogArgs);

        const end = () => {
            console.warn("An attempt was made to end the root dialog. The root dialog cannot be ended.");
            return false;
        }

        return {
            getRoute: (m: M) =>
                toObservable(this.rootDialogInstance.get(m))
                    .flatMap(dialogInstance => {
                        if (dialogInstance) {
                            console.log("routeToRoot dialogInstance", dialogInstance);
                            return this.getRouteFromDialogInstance(dialogInstance, m, undefined, end);
                        }

                        if (!dialogOrName) {
                            console.warn("You attempted to route to a root dialog, but no root dialog has been created. You need to call dialogs.createRoot or name a dialog to create.");
                            return Observable.empty();
                        }

                        return Observable.of({
                            action: () => toObservable(this.setRoot(dialogOrName, m, dialogArgs))
                                .do(di => console.log("routeToRoot: setRoot returned dialogInstance", di))
                                .flatMap(dialogInstance => this.getRouteFromDialogInstance(dialogInstance, m, undefined, end))
                                .flatMap(route => toObservable(route.action()))
                        } as Route);
                    })
        }
    }

    private createDialogRouterHelper(
        dialogInstance: DialogInstance,
        m: M,
        dialogState: DialogState,
        dialogResponseHandler: DialogResponseHandler<M>,
        end: (dialogResponse?: object) => boolean = () => true,
    ): DialogRouterHelper<M> {
        console.log("creating dialogRouterHelper", dialogInstance, m, dialogState, dialogInstances, dialogResponseHandler, end)

        return {
            // core

            state: dialogState.state,

            createInstance: (
                dialogOrName: DialogOrName,
                dialogArgs?: object,
                dialogResponseHandler?: DialogResponseHandler
            ): Promise<DialogInstance> => {
                console.log("dialog.createInstance", dialogOrName)
                return this.createDialogInstance(dialogOrName, m, dialogArgs, dialogResponseHandler)
                    .do(di => console.log("createInstance returning", di))
                    .toPromise();
            },

            routeToInstance: (... args): Router<M> => ({
                getRoute: (m: M) => {
                    console.log("dialog.routeToInstance.getRoute", ... args)
                    const i = args[0].instanceId !== undefined ? 0 : 1;
                    return this.getRouteFromDialogInstance(args[i], m, args[i + 1]);
                }
            }),

            // first: (... routersOrHandlers: (RouterOrHandler<M>)[]): IRouter<M> => {
            //     return first(
            //         ... dialogState.activeDialogs
            //             ? Object.keys(dialogState.activeDialogs).map(name => routeToActive(name))
            //             : [],
            //         ... routersOrHandlers
            //     );
            // },
            
            end: (
                dialogResponse: object = {}
            ): Promise<void> => {
                console.log("dialog.end")
                return end(dialogResponse)
                    ? toObservable(dialogResponseHandler({
                        ... m as any,
                        dialogResponse
                    }))
                        // .flatMap(_ => toObservable(this.destroyDialogInstance(dialogInstance)))
                        .toPromise()
                    : Promise.resolve();
            },

            // activation

            activate: (
                dialogOrName: DialogOrName<M>,
                ... args
            ): Promise<void> => {
                console.log("dialog.activate", dialogOrName, ... args);
                const dialog = this.toLocalOrRemoteDialog(dialogOrName);
                if (!dialog)
                    return Promise.resolve();

                let i = 0;

                let instanceTag = "default";
                if (args.length) {
                    if (typeof args[0] === 'string') {
                        instanceTag = args[0];
                        i = 1;
                    }
                }

                let dialogArgs;
                if (args.length >= i + 1) {
                    if (typeof args[i] !== 'function') {
                        dialogArgs = args[i];
                        i++;
                    }
                }

                let dialogResponseHandler: DialogResponseHandler<M>;
                if (args.length >= i + 1) {
                    dialogResponseHandler = args[i];
                }

                const instanceName = dialog.localName + '@@@' + instanceTag;

                console.log("dialog.activate() derived args", instanceName, dialogArgs, dialogResponseHandler);

                return this.createDialogInstance(dialogOrName, m, dialogArgs, dialogResponseHandler)
                    .map(dialogInstance => {
                        dialogState.activeDialogs[instanceName] = dialogInstance;
                    })
                    .toPromise();
            },

            deactivate: (
                dialogOrName: DialogOrName<M>
            ): void => {
                console.log("dialog.deactivate", dialogOrName)
                delete dialogState.activeDialogs[toLocalName(dialogOrName)];
            },

            isActive: (
                dialogOrName: DialogOrName<M>
            ): boolean => {
                console.log("dialog.isActive", dialogOrName)
                return dialogState.activeDialogs[toLocalName(dialogOrName)] !== undefined;
            },

            routeToActive: (
                dialogOrName: DialogOrName<M>,
                ... args,
            ): Router<M> => ({
                getRoute: (m: M) => {
                    console.log("dialog.routeToActive().getRoute", dialogOrName);
                    const dialog = this.toLocalOrRemoteDialog(dialogOrName);
                    if (!dialog)
                        return Observable.empty();

                    let instanceTag = "default";
                    let i = 0;

                    if (args.length && typeof args[0] === 'string') {
                        instanceTag = args[0];
                        i = 1;
                    }

                    const instanceName = dialog.localName + '@@@' + instanceTag;
                    const dialogResponseHandler: DialogResponseHandler<M> = args[i];
        
                    console.log("dialog.routeToActive() derived args", instanceName, dialogResponseHandler);

                    return toFilteredObservable(dialogState.activeDialogs[instanceName])
                        .flatMap(dialogInstance =>
                            this.getRouteFromDialogInstance(dialogInstance, m, dialogResponseHandler, (dialogResponse) => {
                                delete dialogState.activeDialogs[instanceName];
                                return true;
                            })
                        );
                }
            }),

            // "just works"
    
            routeTo: (
                dialogOrName: DialogOrName<M>,
                ... args
            ): Router<M> => ({
                getRoute: (m: M) => {
                    console.log("dialog.routeTo().getRoute", dialogOrName, ...args);
                    const dialog = this.toLocalOrRemoteDialog(dialogOrName);
                    if (!dialog)
                        return Observable.empty();

                    let instanceTag = 'default';
                    let iArg = 0;

                    if (typeof args[0] === 'string') {
                        instanceTag = args[0];
                        iArg = 1;
                    }

                    const instanceName = toLocalName(dialogOrName) + '@@@' + instanceTag;
                    const dialogInstance = dialogState.activeDialogs[instanceName];

                    let predicateOrMatcher: Predicate<M> | Matcher<M> = () => true;

                    if (args.length >= iArg + 1 && typeof args[iArg] === 'function') {
                        predicateOrMatcher = args[iArg];
                        iArg++;
                    }

                    let getDialogArgs: (n) => object = () => ({});
                    if (args.length >= iArg + 1) {
                        getDialogArgs = typeof args[iArg] === 'function'
                            ? args[iArg]
                            : () => args[iArg];
                    }

                    const dialogResponseHandler = args.length === iArg + 2 ? args[iArg + 1] : undefined;

                    console.log("dialog.routeTo() derived args", instanceName, dialogInstance, predicateOrMatcher, getDialogArgs, dialogResponseHandler);

                    if (dialogInstance)
                        // dialog already active - route the message
                        return this.getRouteFromDialogInstance(dialogInstance, m, dialogResponseHandler, (dialogResponse) => {
                            delete dialogState.activeDialogs[instanceName];
                            return true;
                        });

                    return tryMatch(predicateOrMatcher, m)
                        .map(n => ({
                            action: () => toObservable(getDialogArgs(n))
                                .do(dialogArgs => console.log("dialog.routeTo() dialog args", dialogArgs))
                                .flatMap(dialogArgs => this.createDialogInstance(dialogOrName, m, dialogArgs, dialogResponseHandler))
                                .do(dialogInstance => {
                                    dialogState.activeDialogs[instanceName] = dialogInstance;
                                })
                        } as Route));
                }
            }),

        } as DialogRouterHelper<M>
    }

}
