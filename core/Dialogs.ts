import { IRouter, Handler, routerize, Route, Observableable, toObservable, toFilteredObservable } from './Rules';
import { Observable } from 'rxjs';
import { konsole } from './Konsole';

export interface DialogInstance {
    name: string;
    instanceId: string;
}

export interface IDialogResponseHandlerMatch<DIALOGRESPONSE extends object = object> {
    dialogResponse: DIALOGRESPONSE;
}

export interface DialogResponseHandler<M extends object = any, DIALOGRESPONSE extends object = any> {
    (message: M & IDialogResponseHandlerMatch<DIALOGRESPONSE>): Observableable<void>;
}

export interface DialogState<DIALOGSTATE extends object = any> {
    state: DIALOGSTATE,
    child: DialogInstance,
    activeDialogs: {
        [name: string]: DialogInstance;
    }
}

export interface DialogConstructorHelper<
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGSTATE extends object = any
> {
    state: DIALOGSTATE;

    end(dialogResponse?: DIALOGRESPONSE): Promise<void>;
}

export interface DialogRouterHelper<
    M extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGSTATE extends object = any,
> {
    state: DIALOGSTATE;

    // core        

    createInstance <DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any> (
        dialogOrName: DialogOrName<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>,
        dialogArgs?: DIALOGARGS,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Promise<DialogInstance>;
    
    // destroyInstance(
    //     dialogInstance: DialogInstance
    // ): Promise<void>;

    routeToInstance <DIALOGRESPONSE extends object = any> (
        dialogInstance: DialogInstance,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): IRouter<M>;

    // Use this signature if you want to infer the typing of the dialog
    routeToInstance <DIALOGRESPONSE extends object = any> (
        dialog: LocalOrRemoteDialog<M, any, DIALOGRESPONSE>,
        dialogInstance: DialogInstance,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): IRouter<M>;

    // call this from within a dialog to signal its end and (optionally) pass a response to the dialog response handler
    end(
        dialogResponse?: DIALOGRESPONSE
    ): Promise<void>;

    // stack

    // call this from within a dialog to signal its end and ask the parent dialog to begin another dialog
    replace <DIALOGARGS extends object = any> (
        dialogOrName: DialogOrName<M, DIALOGARGS>,
        args?: DIALOGARGS,
    ): Promise<void>;

    setChild(
        dialogInstance: DialogInstance
    ): Promise<void>;

    // shorthand for createInstance(...).then(di => setChild(di))
    setChild <DIALOGARGS extends object = any> (
        dialogOrName: DialogOrName<M, DIALOGARGS>,
        args?: DIALOGARGS,
    ): Promise<void>;

    clearChild(): void;

    routeToChild(): IRouter<M>;

    // activation

    activate<DIALOGARGS extends object = any> (
        dialogOrName: DialogOrName<M, DIALOGARGS>,
        args?: DIALOGARGS,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): Promise<void>;

    deactivate(
        dialogOrName: DialogOrName<M>
    ): void;

    isActive(
        dialogOrName: DialogOrName<M>
    ): boolean;

    routeTo(
        dialogOrName: DialogOrName<M>,
        dialogResponseHandler?: DialogResponseHandler<M, DIALOGRESPONSE>
    ): IRouter<M>;
}

export interface DialogConstructor<
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGSTATE extends object = any
> {
    (dialog: DialogConstructorHelper<M, DIALOGRESPONSE, DIALOGSTATE>, message: M, args?: DIALOGARGS): Observableable<void>;
}

export interface DialogRouter<
    M extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGSTATE extends object = any
> {
    (dialog: DialogRouterHelper<M, DIALOGRESPONSE, DIALOGSTATE>): IRouter<M>;
}

export interface IDialog<
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGSTATE extends object = any,
> {
    constructor?: DialogConstructor<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>,
    router: DialogRouter<M, DIALOGRESPONSE, DIALOGSTATE>,
}

export interface LocalDialog<
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGSTATE extends object = any,
> {
    localName: string;
    remoteName?: string;    // If defined, how it is named to the outside world, otherwise not exposed
    constructor: DialogConstructor<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;
    router: DialogRouter<M, DIALOGRESPONSE, DIALOGSTATE>;
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
    DIALOGSTATE extends object = any,
> = LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE> | RemoteDialog<M, DIALOGARGS, DIALOGRESPONSE>

export interface DialogRegistry<M extends object = any> {
    [name: string]: LocalOrRemoteDialog<M>;
}

const isLocalDialog = <
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGSTATE extends object = any
> (localOrRemoteDialog: LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>)
: localOrRemoteDialog is LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE> =>
    (localOrRemoteDialog as any).router !== undefined;

export type DialogOrName<
    M extends object = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGSTATE extends object = any,
> = LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE> | string;

export const nameize = (dialogOrName: DialogOrName): string =>
    typeof dialogOrName === 'string'
        ? dialogOrName
        : dialogOrName.localName;

export interface RootDialogInstance {
    get: (message: any) => Observableable<DialogInstance>;
    set: (message: any, rootDialogInstance?: DialogInstance) => Observableable<void>;
}

export interface LocalDialogInstances {
    createInstance: (name: string, dialogState?: any) => Observableable<DialogInstance>,
    destroyInstance: (dialogInstance: DialogInstance) => Observableable<void>,
    getDialogState: (dialogInstance: DialogInstance) => Observableable<any>,
    setDialogState: (dialogInstance: DialogInstance, dialogState?: any) => Observableable<void>
}

export interface DialogTask {
    method: string;
    args?: any;
}

// export interface RemoteDialogProxy<M extends object = any> {
//     matchLocalToRemote?: (message: M) => Observableable<any>,
//     matchRemoteToLocal?: (message: any, tasks: DialogTask[]) => Observableable<M>,
//     executeTask?: (message: M, tasks: DialogTask) => Observableable<any>,
// }

// export interface RemoteActivateRequest {
//     method: 'activate';
//     name: string;
//     message: any;
//     args: any;
// }

// export type RemoteActivateResponse = {
//     status: 'success';
//     instance: string;
//     tasks: any[];
// } | {
//     status: 'error';
//     error: string;
// }

// export interface RemoteTryMatchRequest {
//     method: 'tryMatch';
//     name: string;
//     instance: string;
//     message: any;
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
    [name: string]: any[];
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
        dialogInstances[dialogInstance.name][dialogInstance.instanceId] = undefined;
    },
    getDialogState: (dialogInstance) => ({ ... dialogInstances[dialogInstance.name][dialogInstance.instanceId] }),
    setDialogState: (dialogInstance, dialogData?) => {
        dialogInstances[dialogInstance.name][dialogInstance.instanceId] = dialogData;
    }
}

export class Dialogs<M extends object = any> {
    private dialogRegistry: DialogRegistry<M> = {}

    constructor(
        private rootDialogInstance: RootDialogInstance,
        private localDialogInstances: LocalDialogInstances = inMemoryDialogInstances,
        // private remoteDialogProxy: RemoteDialogProxy<M>,
    ) {
    }

    private localOrRemoteDialog<DIALOGARGS extends object = any>(
        dialogOrName: DialogOrName<M, DIALOGARGS>
    ): LocalOrRemoteDialog<M, DIALOGARGS> {
        if (typeof dialogOrName !== 'string')
            return dialogOrName;

        const localOrRemoteDialog = this.dialogRegistry[dialogOrName];
        if (localOrRemoteDialog)
            return localOrRemoteDialog;
        
        console.warn(`You referenced a dialog named "${dialogOrName}" but no such dialog exists.`)
    }

    // add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGSTATE extends object = any>(
    //     localName: string,
    //     remoteName: string,
    //     dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>
    // ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    // add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGSTATE extends object = any>(
    //     localName: string,
    //     remoteable: boolean,
    //     dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>
    // ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGSTATE extends object = any>(
        localName: string,
        dialog: IDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGSTATE extends object = any>(
        localName: string,
        remoteName: string,
        constructor: DialogConstructor<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>,
        router: DialogRouter<M, DIALOGRESPONSE, DIALOGSTATE>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGSTATE extends object = any>(
        localName: string,
        remoteable: boolean,
        constructor: DialogConstructor<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>,
        router: DialogRouter<M, DIALOGRESPONSE, DIALOGSTATE>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGSTATE extends object = any>(
        localName: string,
        constructor: DialogConstructor<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>,
        router: DialogRouter<M, DIALOGRESPONSE, DIALOGSTATE>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGSTATE extends object = any>(
        localName: string,
        remoteName: string,
        router: DialogRouter<M, DIALOGRESPONSE, DIALOGSTATE>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGSTATE extends object = any>(
        localName: string,
        remoteable: boolean,
        router: DialogRouter<M, DIALOGRESPONSE, DIALOGSTATE>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGSTATE extends object = any>(
        localName: string,
        router: DialogRouter<M, DIALOGRESPONSE, DIALOGSTATE>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGSTATE>;

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
            let constructor = () => {};
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
                constructor = arguments[dialogIndex];
                router = arguments[dialogIndex + 1];
            } else if (arguments[dialogIndex].router) {
                // IDialog
                constructor = arguments[dialogIndex].constructor;
                router = arguments[dialogIndex].router;
            } else {
                // just router (use default init)
                router = arguments[dialogIndex];
            }

            dialog = {
                localName,
                remoteName,
                constructor,
                router,
            }
        }

        if (this.dialogRegistry[localName]) {
            console.warn(`You attempted to add a dialog named "${localName}" but a dialog with that name already exists.`);
            return;
        }

        this.dialogRegistry[localName] = dialog;

        return dialog;
    }

    private getRouteFromDialogInstance(
        dialogInstance: DialogInstance,
        m: M,
        dialogResponseHandler: DialogResponseHandler<M> = () => {},
        end: (dialogResponse?: any) => boolean = () => true,
        replace?: (dialogOrName: DialogOrName, args?: any) => Promise<void>
    ): Observable<Route> {

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
                    localOrRemoteDialog.router(this.createDialogRouterHelper(dialogInstance, m, dialogState, dialogResponseHandler, end, replace))
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
        //                         instance: dialogInstance.instance,
        //                         message
        //                     })
        //                 }
        //             )
        //             .then(response => response.json())
        //         )
        //         .flatMap<RemoteTryMatchResponse, Route>(response => {
        //             if (response.status === 'error')
        //                 return Observable.throw(`RemoteDialog.tryMatch returned error "${response.error}".`);

        //             if (response.status === 'matchless')
        //                 return Observable.empty<Route>();

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
    //         return toObservable(this.localDialogInstances.getDialogData<DIALOGSTATE>(dialogInstance))
    //             .flatMap(dialogState =>
    //                 dialog.router.getRoute({
    //                     ... m as any,

    //                     dialogState,
    //                     dialogStack: [... m.dialogStack, dialogInstance],

    //                     beginChildDialog: <DIALOGARGS extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS) =>
    //                         this.activate(dialogOrName, m, dialogArgs)
    //                             .do(dialogInstance => m.dialogState.childDialogInstance = dialogInstance)
    //                             .toPromise(),
    //                     clearChildDialog: () => new Promise<void>((resolve) => {
    //                         dialogState.childDialogInstance = undefined;
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

    private createDialogInstance(
        dialogOrName: DialogOrName<M>,
        m: M,
        dialogArgs?: any,
        dialogResponseHandler?: DialogResponseHandler<M>
    ): Observable<DialogInstance> {

        console.log("createDialogInstance");
        const localOrRemoteDialog = this.localOrRemoteDialog(dialogOrName);
        if (!localOrRemoteDialog)
            return Observable.empty();

        if (isLocalDialog(localOrRemoteDialog)) {
            if (!localOrRemoteDialog.constructor)
                return toObservable(this.localDialogInstances.createInstance(localOrRemoteDialog.localName));

            let ended = false;
            const shim = (dialogResponse) => {
                ended = true;
                return dialogResponseHandler(dialogResponse);
            }
            const dialogConstructorHelper = this.createDialogConstructorHelper(m, shim);
            return toObservable(localOrRemoteDialog.constructor(dialogConstructorHelper, m, dialogArgs))
                .flatMap(_ => {
                    if (ended)
                        return Observable.empty();
                    return toObservable(this.localDialogInstances.createInstance(localOrRemoteDialog.localName, {
                        state: dialogConstructorHelper.state,
                    } as DialogState))
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

    // These methods are used to serve up local dialogs remotely

    // remoteActivate(name: string, remoteMatch: any, dialogArgs: any): Observable<RemoteActivateResponse> {
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

    // private matchLocalToRemote(message: M & IDialogMatch): any {
    //     return {
    //         ... this.remoteDialogProxy.matchLocalToRemote(message),
    //         dialogStack: message.dialogStack,
    //     }
    // }

    // private matchRemoteToLocal(message: any, tasks: DialogTask[]) {
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

    // remoteTryMatch(name: string, instance: string, remoteMatch: any): Observable<RemoteTryMatchResponse> {
    //     const tasks: DialogTask[] = [];

    //     const message: M & IDialogMatch = {
    //         ... this.matchRemoteToLocal(remoteMatch, tasks) as any,
    //         beginChildDialog: (dialogOrName: DialogOrName<M>, dialogArgs?: any) =>
    //             // will only be called by replaceThisDialog
    //             new Promise<void>((resolve) => {
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
    //             new Promise<void>((resolve) => {
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

    createRoot <DIALOGARGS extends object = any> (
        dialogOrName: DialogOrName<M, DIALOGARGS>,
        m: M,
        args?: DIALOGARGS
    ) {
        console.log("createRoot", dialogOrName, m);
        return toObservable(this.createDialogInstance(dialogOrName, m, args))
            .flatMap(dialogInstance =>
                toObservable(this.rootDialogInstance.set(m, dialogInstance))
                    .map(_ => dialogInstance)
            )
            .toPromise();
    }

    routeToRoot <DIALOGARGS extends object = any> (
        dialogOrName?: DialogOrName<M, DIALOGARGS>,
        args?: DIALOGARGS
    ): IRouter<M> {
        console.log("routeToRoot")
        return {
            getRoute: (m: M) =>
                toObservable(this.rootDialogInstance.get(m))
                    .flatMap(dialogInstance => {
                        if (dialogInstance)
                            return Observable.of(dialogInstance);

                        if (!dialogOrName) {
                            console.warn("You attempted to route to a root dialog, but bo root dialog has been created. You need to call dialogs.createRoot or name a dialog to create.");
                            return Observable.empty<DialogInstance>();
                            }

                        return this.createRoot(dialogOrName, m, args);
                    })
                    .flatMap(dialogInstance => {
                        console.log("routeToRoot dialogInstance", dialogInstance);
                        return this.getRouteFromDialogInstance(dialogInstance, m, undefined, () => {
                            console.warn("An attempt was made to end or replace the root dialog. The root dialog cannot be ended or replaced.");
                            return false;
                        })
                    })
            }
    }

    createDialogConstructorHelper (
        m: M,
        dialogResponseHandler: DialogResponseHandler<M>,
    ): DialogConstructorHelper {
        return {
            state: {},

            end: (dialogResponse?: any): Promise<void> => 
                toObservable(dialogResponseHandler(dialogResponse))
                    .toPromise(),
        }
    }

    createDialogRouterHelper (
        dialogInstance: DialogInstance,
        m: M,
        dialogState: DialogState,
        dialogResponseHandler: DialogResponseHandler<M>,
        end: (dialogResponse?: any) => boolean = () => true,
        replace?: (dialogOrName: DialogOrName, args?: any) => Promise<void>
    ): DialogRouterHelper {
        console.log("creating dialogRouterHelper", dialogInstance, dialogState, dialogInstances);

        return {

            // core

            state: dialogState.state,

            createInstance: (
                dialogOrName: DialogOrName,
                dialogArgs?: any,
                dialogResponseHandler?: DialogResponseHandler
            ): Promise<DialogInstance> => {
                console.log("dialog.createInstance", dialogOrName)
                return this.createDialogInstance(dialogOrName, m, dialogArgs, dialogResponseHandler)
                    .toPromise();
            },

            routeToInstance: (... args): IRouter<M> => {
                console.log("dialog.routeToInstance", args)
                const i = args[0].instance !== undefined ? 0 : 1;
                return {
                    getRoute: (m: M) => 
                        this.getRouteFromDialogInstance(args[i], m, args[i + 1])
                }
            },

            end: (
                dialogResponse?: any
            ): Promise<void> => {
                console.log("dialog.end")
                return end(dialogResponse)
                    ? toObservable(dialogResponseHandler(dialogResponse))
                        // .flatMap(_ => toObservable(this.destroyDialogInstance(dialogInstance)))
                        .toPromise()
                    : Promise.resolve();
            },

            // stack

            replace: (
                dialogOrName: DialogOrName<M>,
                args?: any,
            ): Promise<void> => {
                console.log("dialog.replace", dialogOrName, args)
                return end() && replace
                    ? replace(dialogOrName, args)
                    : Promise.resolve();
            },

            setChild: (... args): Promise<void> => {
                console.log("dialog.setChild", args)
                if (args[0].instance !== undefined) {
                    dialogState.child = args[0];
                    return Promise.resolve();
                }

                return this.createDialogInstance(args[0], m, ... args.slice(1))
                    .map(dialogInstance => {
                        dialogState.child = dialogInstance;
                    })
                    .toPromise();
            },

            clearChild: (): void => {
                console.log("dialog.clearChild")
                dialogState.child = undefined;
            },

            routeToChild: (): IRouter<M> => {
                console.log("dialog.routeToChild")
                return {
                    getRoute: (m: M) => dialogState.child
                        ? this.getRouteFromDialogInstance(dialogState.child, m, undefined,
                                (dialogResponse) => {
                                    dialogState.child = undefined;
                                    if (dialogResponse !== undefined)
                                        console.warn(`Stacked dialog ${dialogState.child.name} returned a response. It was ignored.`);
                                    return true;
                                },
                                (dialogOrName, args) =>
                                    this.createDialogInstance(dialogOrName, m, args)
                                        .map(dialogInstance => {
                                            dialogState.child = dialogInstance;
                                        })
                                        .toPromise()
                            )
                        : Observable.empty()
                }
            },

            // activation

            activate: (
                dialogOrName: DialogOrName<M>,
                dialogArgs?: any,
                dialogResponseHandler?: DialogResponseHandler<M>
            ): Promise<void> => {
                console.log("dialog.activate", dialogOrName, dialogArgs, dialogResponseHandler)
                return this.createDialogInstance(dialogOrName, m, dialogArgs, dialogResponseHandler)
                    .map(dialogInstance => {
                        if (!dialogState.activeDialogs)
                            dialogState.activeDialogs = {};
                        dialogState.activeDialogs[dialogInstance.name] = dialogInstance;
                    })
                    .toPromise();
            },

            deactivate: (
                dialogOrName: DialogOrName<M>
            ): void => {
                console.log("dialog.deactivate", dialogOrName)
                if (dialogState.activeDialogs)
                    dialogState.activeDialogs[nameize(dialogOrName)] = undefined;
            },

            isActive: (
                dialogOrName: DialogOrName<M>
            ): boolean => {
                console.log("dialog.isActive", dialogOrName)
                return dialogState.activeDialogs !== undefined && dialogState.activeDialogs[nameize(dialogOrName)] !== undefined;
            },

            routeTo: (
                dialogOrName: DialogOrName<M>,
                dialogResponseHandler?: DialogResponseHandler<M>
            ): IRouter<M> => {
                console.log("dialog.routeTo", dialogOrName)
                const name = nameize(dialogOrName);
                return {
                    getRoute: (m: M) => dialogState.activeDialogs && dialogState.activeDialogs[name]
                        ? this.getRouteFromDialogInstance(dialogState.activeDialogs[name], m, dialogResponseHandler, (dialogResponse) => {
                                if (dialogState.activeDialogs)
                                    dialogState.activeDialogs[name] = undefined;
                                return true;
                            })
                        : Observable.empty()
                }
            }

        } 
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
    //                 if (!message.dialogState.childDialogInstance)
    //                     return;
    //                 odi = Observable.of(message.dialogState.childDialogInstance);
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


