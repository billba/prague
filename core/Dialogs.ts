import { Match, IRule, Handler, ruleize, RuleResult, Observableable, toObservable } from './Rules';
import { Observable } from 'rxjs';
import { konsole } from './Konsole';

const pragueRoot = 'pragueRoot';

export interface DialogInstance {
    name: string;
    instance: string;
}

export interface DialogRegistry<M extends Match = any> {
    [name: string]: LocalOrRemoteDialog<M>;
}

export interface IDialogRootMatch<M extends Match = any> {
    beginChildDialog<DIALOGARGS extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS): Promise<void>;
    clearChildDialog(): Promise<void>;
}

export type IDialogData<DIALOGDATA extends object> = { childDialogInstance?: DialogInstance } & DIALOGDATA;

export interface IDialogMatch<M extends Match = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any> extends IDialogRootMatch<M> {
    dialogData: IDialogData<DIALOGDATA>;
    dialogStack: DialogInstance[];
    replaceThisDialog<DIALOGARGS extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS, dialogResponse?: DIALOGRESPONSE): Promise<void>;
    endThisDialog(dialogResponse?: DIALOGRESPONSE): Promise<void>;
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

export interface XDialog<
    M extends Match = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGDATA extends object = any,
> {
    init?: (match: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA>,
    rule: IRule<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>,
}

export interface LocalDialog<
    M extends Match = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGDATA extends object = any,
> {
    localName: string;
    remoteName?: string;    // If defined, how it is named to the outside world, otherwise not exposed
    init: (match: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA>;
    rule: IRule<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>;
}

export interface RemoteDialog<
    M extends Match = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
> {
    remoteUrl: string;
    localName: string;
    remoteName: string;
}

export type LocalOrRemoteDialog<
    M extends Match = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGDATA extends object = any,
> = LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA> | RemoteDialog<M, DIALOGARGS, DIALOGRESPONSE>

const isLocalDialog = <
    M extends Match = any,
    DIALOGARGS extends object = any,
    DIALOGRESPONSE extends object = any,
    DIALOGDATA extends object = any,
> (localOrRemoteDialog: LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>)
: localOrRemoteDialog is LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA> =>
    (localOrRemoteDialog as any).rule !== undefined;

/* TODO:
    - examine each "run rule" case, make sure dialog stack methods are created correctly
*/

// Sample code

import { first } from './Rules';

interface Base extends Match {
    foo: string;
}

interface Args {
    cat: number;
}

interface Response {
    dog: string;
}

interface Data {
    isCat: boolean
}

const fooDialog: XDialog<Base, Args, Response, Data> = {
    init: match => ({ isCat: false }),
    rule: first(
        m => console.log("does something"),
        m => m.beginChildDialog(barDialog, { cat: "canary" })
    )
}

const dialogs = new Dialogs<Base>();

dialogs.add('foo', 'foobar', fooDialog);
dialogs.add('foo', true, fooDialog);
dialogs.add('foo', fooDialog);
dialogs.add('foo', rule);
dialogs.add('foo', init, rule);


// End of sample code

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

export interface DialogTask {
    method: string;
    args?: any;
}

export interface RemoteDialogProxy<M extends Match = any> {
    matchLocalToRemote?: (match: M) => Observableable<any>,
    matchRemoteToLocal?: (match: any, tasks: DialogTask[]) => Observableable<M>,
    executeTasks?: (match: M, tasks: DialogTask[]) => Observableable<any>,
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
    tasks: any[];
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
    status: 'match';
    tasks: DialogTask[];
} | {
    status: 'endThisDialog';
    tasks: DialogTask[];
    response?: any;
} | {
    status: 'replaceThisDialog';
    tasks: DialogTask[];
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
            beginChildDialog: <DIALOGARGS extends object = any>(dialog: LocalOrRemoteDialog<M, DIALOGARGS> | string, dialogArgs?: DIALOGARGS) =>
                this.activate(dialog, match, dialogArgs)
                    .flatMap(dialogInstance => toObservable(this.rootDialogInstance.set(match, dialogInstance)))
                    .toPromise(),
            clearChildDialog: () => toObservable(this.rootDialogInstance.set(match)).toPromise()
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
        init: (match: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA>,
        rule: IRule<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteable: boolean,
        init: (match: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA>,
        rule: IRule<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        init: (match: M & IDialogArgsMatch<DIALOGARGS>) => Observableable<DIALOGDATA>,
        rule: IRule<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteName: string,
        rule: IRule<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        remoteable: boolean,
        rule: IRule<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
    ): LocalDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA>;

    add<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(
        localName: string,
        rule: IRule<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>> | Handler<M & IDialogMatch<M, DIALOGRESPONSE, DIALOGDATA>>
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
            let rule;
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
                // init + rule
                init = args[dialogIndex];
                rule = args[dialogIndex + 1];
            } else if (args[dialogIndex].rule) {
                // XDialog
                init = args[dialogIndex].init;
                rule = args[dialogIndex].rule;
            } else {
                // just rule (use default init)
                rule = args[dialogIndex];
            }

            dialog = {
                localName,
                remoteName,
                init,
                rule: ruleize(rule),
            }
        }

        if (this.dialogs[localName]) {
            console.warn(`You attempted to add a dialog named "${localName}" but a dialog with that name already exists.`);
            return;
        }

        this.dialogs[localName] = dialog;

        return dialog;
    }

    private dialogize(dialog: LocalOrRemoteDialog<M> | string): LocalOrRemoteDialog<M> {
        if (typeof dialog !== 'string')
            return dialog;

        const dialogT = this.dialogs[dialog];
        if (dialogT)
            return dialogT;
        
        console.warn(`You referenced a dialog named "${dialog}" but no such dialog exists.`)
    }

    private activate<DIALOGARGS extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS> | string, match: M, dialogArgs?: DIALOGARGS): Observable<DialogInstance> {
        const dialog = this.dialogize(dialogOrName);

        if (isLocalDialog(dialog)) {
            return toObservable(dialog.init({
                    ... match as any,
                    dialogArgs
                } as M & IDialogArgsMatch<DIALOGARGS>))
                    .flatMap(dialogData => toObservable(this.localDialogInstances.newInstance(dialog.localName, dialogData)));
        } else {
            return toObservable(this.remoteDialogProxy.matchLocalToRemote(m))
                .flatMap(match =>
                    fetch(
                        dialog.remoteUrl,
                        {
                            method: 'POST',
                            headers: new Headers({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({
                                method: 'activate',
                                name: dialog.remoteName,
                                args: dialogArgs,
                                match
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

                    return toObservable(this.remoteDialogProxy.executeTasks(match, response.tasks))
                        .map(_ => ({
                            name: dialog.localName,
                            instance: response.instance
                        } as DialogInstance));
                });
        }
    }

    private tryMatch<DIALOGARGS extends object = any, DIALOGRESPONSE extends object = any, DIALOGDATA extends object = any>(dialogOrName: LocalOrRemoteDialog<M, DIALOGARGS, DIALOGRESPONSE, DIALOGDATA> | string, match: M & IDialogMatch<DIALOGRESPONSE>, dialogInstance: DialogInstance): Observable<RuleResult> {
        const dialog = this.dialogize(dialogOrName);

        if (isLocalDialog(dialog)) {
            // rule: (dialogInstance: DialogInstance, dialogResponder?: DialogResponder<M, DIALOGRESPONSE>) => ({
            //     tryMatch: (match: M & IDialogMatch<M, DIALOGRESPONSE>) =>
            return toObservable(this.localDialogInstances.getDialogData<DIALOGDATA>(dialogInstance))
                .flatMap(dialogData =>
                    dialog.rule.tryMatch({
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
        } else {
            // rule: (dialogInstance: DialogInstance, dialogResponder?: DialogResponder<M, DIALOGRESPONSE>) => ({
            //     tryMatch: (match: M & IDialogMatch<M, DIALOGRESPONSE>) =>
            return toObservable(this.remoteDialogProxy.matchLocalToRemote(match))
                .flatMap(match =>
                    fetch(
                        dialog.remoteUrl,
                        {
                            method: 'POST',
                            headers: new Headers({ 'Content-Type': 'application/json' }),
                            body: JSON.stringify({
                                method: 'tryMatch',
                                name: dialog.remoteName,
                                instance: dialogInstance.instance,
                                match
                            })
                        }
                    )
                    .then(response => response.json() as Promise<RemoteTryMatchResponse>)
                )
                .flatMap<RemoteTryMatchResponse, RuleResult>(response => {
                    if (response.status === 'error')
                        return Observable.throw(`RemoteDialog.tryMatch returned error "${response.error}".`);

                    if (response.status === 'matchless')
                        return Observable.empty<RuleResult>();

                    if (response.status !== 'replaceThisDialog' && response.status !== 'endThisDialog' && response.status !==  'match') {
                        return Observable.throw(`RemoteDialog.tryMatch returned unexpected status "${(response as any).status}".`);
                    }

                    if (response.status === 'replaceThisDialog' || response.status === 'endThisDialog') {
                        // end dialog, handle response
                    }

                    if (response.status === 'replaceThisDialog') {
                        // start new dialog
                    }

                    return Observable.of({
                            action: () => response.tasks && response.tasks.length && this.remoteDialogProxy.executeTasks(match, response.tasks)
                        } as RuleResult);
                });
        }
    }

    // These methods are used to serve up local dialogs remotely

    remoteActivate(name: string, remoteMatch: any, dialogArgs: any): Observable<RemoteActivateResponse> {
        const tasks: DialogTask[] = [];

        return this.activate(
            name, {
                ... this.matchRemoteToLocal(remoteMatch) as any,                           // dialog-specific 
                ... this.remoteDialogProxy.matchRemoteToLocal(remoteMatch, tasks) as any,  // provided by recipe
            },
            dialogArgs
        )
            .map(dialogInstance => ({
                status: 'success',
                tasks
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
        const tasks: DialogTask[] = [];

        const match: M & IDialogMatch = {
            ... this.matchRemoteToLocal(remoteMatch) as any,                    // dialog-specific 
            ... this.remoteDialogProxy.matchRemoteToLocal(remoteMatch, tasks) as any,  // provided by recipe
            // beginChildDialog: // normal
            // clearChildDialog: // normal
            // endThisDialog:    // weird return stuff
            // replaceThisDialog:// weird return stuff
        };

        console.log("remoteTryMatch", match);

        return this.tryMatch(name, match, { name, instance })
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
            } as RemoteTryMatchResponse))
    }
}
