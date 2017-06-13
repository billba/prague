import { Match, IRule, BaseRule, RuleResult, Observizeable, observize } from './Rules';
import { Observable } from 'rxjs';
import { konsole } from './Konsole';

export interface DialogInstance {
    name: string;
    instance: string;
}

const rootDialogInstance: DialogInstance = {
    name: '/',
    instance: undefined
}

export interface IDialogMatch<DIALOGRESPONSE extends object = object> {
    dialogInstance?: DialogInstance;
    beginChildDialog<DIALOGARGS = any>(name: string, args?: DIALOGARGS): void;
    replaceThisDialog<DIALOGARGS = any>(name: string, args?: DIALOGARGS): void;
    endThisDialog(args?: DIALOGRESPONSE): void;
    clearChildDialog(): void;
}

export interface IDialogStateMatch<DIALOGSTATE> {
    dialogData: DIALOGSTATE;
}

export interface IDialogArgsMatch<DIALOGARGS> {
    dialogArgs: DIALOGARGS;
}

export interface IDialog<M extends Match = any, DIALOGARGS = any, DIALOGRESPONSE extends object = object> {
    invoke(name: string, match: M & IDialogMatch<DIALOGRESPONSE> & IDialogArgsMatch<DIALOGARGS>): Observable<string>;
    tryMatch(dialogInstance: DialogInstance, match: M & IDialogMatch<DIALOGRESPONSE>): Observable<RuleResult>;
}

interface DialogTask {
    (): Observable<void>;
}

export interface DialogStack {
    getActiveDialogInstance: (match: any, currentDialogInstance: DialogInstance) => Observizeable<DialogInstance>;
    setActiveDialogInstance: (match: any, currentDialogInstance: DialogInstance, activeDialogInstance?: DialogInstance) => Observizeable<void>;
}

export interface IDialogResponderMatch<DIALOGRESPONSE extends object = object> {
    dialogResponse: DIALOGRESPONSE;
}

export interface DialogResponder<M extends Match = any, DIALOGRESPONSE extends object = object> {
    (match: M & IDialogMatch<DIALOGRESPONSE> & IDialogResponderMatch<DIALOGRESPONSE>): Observizeable<void>;
}

export interface DialogResponders<M extends Match = any> {
    [name: string]: DialogResponder<M>;
}

export class Dialogs<M extends Match = any> {
    private dialogs: {
        [name: string]: IDialog<M>;
    } = {}

    constructor(private dialogStack: DialogStack) {
    }

    add(name: string, dialog: IDialog<M>) {
        if (this.dialogs[name]) {
            console.warn(`You attempted to add a dialog named "${name}" but a dialog with that name already exists.`);
            return;
        }
        this.dialogs[name] = dialog;
    }

    addRule<DIALOGRESPONSE extends object = object>(name: string, rule: IRule<M & IDialogMatch<DIALOGRESPONSE>>) {
        this.add(name, {
            invoke: () => Observable.of("shared instance"),
            tryMatch: (dialogInstance: DialogInstance, match: M & IDialogMatch<DIALOGRESPONSE>) => rule.tryMatch(match)
        });
    }

    private addDialogTask(
        tasks: DialogTask[],
        match: M & IDialogMatch,
        parentDialogInstance: DialogInstance,
        name?: string,
        args?: any
    ) {
        if (name) {
            const dialog = this.dialogs[name];
            if (!dialog) {
                console.warn(`You attempted to begin a dialog named "${name}" but no dialog with that name exists.`);
                return;
            }
            tasks.push(() => Observable.of(dialog)
                .flatMap(dialog => dialog.invoke(name, {
                    ... match as any,
                    dialogArgs: args
                }))
                .flatMap(instance => observize(this.dialogStack.setActiveDialogInstance(match, parentDialogInstance, { name, instance })))
            );
        } else {
            tasks.push(() => observize(this.dialogStack.setActiveDialogInstance(match, parentDialogInstance)));
        }
    }

    runIfActive<ANYMATCH extends Match = M>(name: string, responder: DialogResponder<ANYMATCH>): IRule<ANYMATCH>;
    runIfActive<ANYMATCH extends Match = M>(responders?: DialogResponders<ANYMATCH>): IRule<ANYMATCH>;
    runIfActive<ANYMATCH extends Match = M>(... args: any[]): IRule<ANYMATCH> {
        const dialogs = this.dialogs,
            dialogStack = this.dialogStack,
            addDialogTask = (
                tasks: DialogTask[],
                match: ANYMATCH & IDialogMatch,
                parentDialogInstance: DialogInstance,
                name?: string,
                args?: any
            ) => this.addDialogTask(tasks, match as any as M & IDialogMatch, parentDialogInstance, name, args);
        
        return new class extends BaseRule<ANYMATCH & IDialogMatch> {
            responders: DialogResponders<ANYMATCH>;

            constructor(... args: any[]) {
                super();
                if (args.length === 2)
                    this.responders = { [args[0]]: args[1] };
                else if (args.length === 1)
                    this.responders = args[0];
            }

            tryMatch(match: ANYMATCH & IDialogMatch): Observable<RuleResult> {
                console.log("runifActive.tryMatch", match, dialogStack);
                return (
                    match.dialogInstance
                        ? observize(dialogStack.getActiveDialogInstance(match, match.dialogInstance))
                        : Observable.of(rootDialogInstance)
                    )
                    .flatMap(activeDialogInstance => {
                        let responder: DialogResponder;
                        if (this.responders) {
                            responder = this.responders[activeDialogInstance.name];
                            if (!responder)
                                return Observable.empty<RuleResult>();
                        }
                        const dialog = dialogs[activeDialogInstance.name];
                        if (!dialog) {
                            console.warn(`A dialog named "${activeDialogInstance.name}" doesn't exist.`);
                            return Observable.empty<RuleResult>();
                        }
                        const tasks: DialogTask[] = [];
                        return dialog.tryMatch(activeDialogInstance, {
                                ... match as any,
                                dialogInstance: activeDialogInstance,
                                beginChildDialog: (name: string, args?: any) => addDialogTask(tasks, match, activeDialogInstance, name, args),
                                replaceThisDialog: match.dialogInstance
                                    ? (name: string, args?: any) => addDialogTask(tasks, match, match.dialogInstance, name, args)
                                    : () => console.warn("You cannot replace the root dialog"),
                                endThisDialog: match.dialogInstance
                                    ? (args?: object) => {
                                        addDialogTask(tasks, match, match.dialogInstance);
                                        if (responder)
                                            tasks.push(() => observize(responder({
                                                ... match as any,
                                                dialogResponse: args
                                            })));
                                    }
                                    : () => console.warn("You cannot end the root dialog"),
                                clearChildDialog: () => addDialogTask(tasks, match, match.dialogInstance || activeDialogInstance),
                            })
                            .map(ruleResult => ({
                                ... ruleResult,
                                action: () =>
                                    observize(ruleResult.action(), false)
                                        .flatMap(_ =>
                                            Observable.from(tasks)
                                            .flatMap(task => task(), 1)
                                            .count()
                                        )
                            }))
                    });
            }
        }(... args) as IRule<ANYMATCH>
    }
}

export class RemoteDialogs<M extends Match = any> {
    constructor(
        private matchRemoteDialog: (match: M & IDialogMatch) => any,
        private handleSuccessfulResponse: (response: any) => Observizeable<void>
    ) {
    }

    dialog<DIALOGARGS>(
        remoteUrl: string
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
                                    dialogInstance,
                                    match: this.matchRemoteDialog(match)
                                }
                            }
                        )
                        .then(response => response.json())
                    )
                    .flatMap(json => {
                        switch (json.status) {
                            case 'endWithResult':
                                // end dialog, then fall through
                            case 'result':
                                return observize(this.handleSuccessfulResponse(json.ruleResult));
                            case 'matchless':
                                return Observable.empty();
                            case 'error':
                                return Observable.throw(`RemoteDialog.tryMatch() returned error "${json.error}".`);
                            default:
                                return Observable.throw(`RemoteDialog.tryMatch() returned unexpected status "${json.status}".`);
                        }
                    })
        }
    }
}

export interface DialogInstances {
    newInstance: (name: string, dialogData: any) => Observizeable<string>,
    getDialogData: (dialogInstance: DialogInstance) => Observizeable<any>,
    setDialogData: (dialogInstance: DialogInstance, dialogData?: any) => Observizeable<void>
}

export class LocalDialogs<M extends Match = any> {
    constructor(private dialogInstances: DialogInstances) {
    }

    dialog<DIALOGDATA = undefined, DIALOGARGS = any, DIALOGRESPONSE extends object = object>(
        rule: IRule<M & IDialogMatch<DIALOGRESPONSE> & IDialogStateMatch<DIALOGDATA>>,
        init?: (match: M & IDialogMatch<DIALOGRESPONSE> & IDialogArgsMatch<DIALOGARGS>) => DIALOGDATA
    ): IDialog<M & IDialogMatch<DIALOGRESPONSE>> {
        return {
            invoke: (name: string, match: M & IDialogMatch<DIALOGRESPONSE> & IDialogArgsMatch<DIALOGARGS>) =>
                (init ? observize(init(match)) : Observable.of({}))
                    .flatMap(dialogData => observize(this.dialogInstances.newInstance(name, dialogData))),

            tryMatch: (dialogInstance: DialogInstance, match: M) =>
                observize(this.dialogInstances.getDialogData(dialogInstance) as DIALOGDATA)
                    .flatMap(dialogData =>
                        rule.tryMatch({
                            ... match as any,
                            dialogData
                        })
                        .map(ruleResult => ({
                            ... ruleResult,
                            action: () =>
                                observize(ruleResult.action(), false)
                                .flatMap(_ => observize(this.dialogInstances.setDialogData(dialogInstance, dialogData)))
                        }))
                    )
        }
    }
}
