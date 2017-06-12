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

export interface IDialogMatch {
    currentDialogInstance?: DialogInstance;
    beginChildDialog(name: string, args?: any): void;
    replaceThisDialog(name: string, args?: any): void;
    endThisDialog(args?: any): void;
    clearChildDialog(): void;
}

export interface IDialogStateMatch<DIALOGSTATE> {
    dialogData: DIALOGSTATE;
}

export interface IDialog<M extends Match & IDialogMatch> {
    invoke(name: string, args?: any): Observable<string>;
    tryMatch(dialogInstance: DialogInstance, match: M): Observable<RuleResult>;
}

interface DialogTask {
    (): Observable<void>;
}

interface DialogStack {
    getActiveDialogInstance: (match: any, currentDialogInstance: DialogInstance) => Observizeable<DialogInstance>;
    setActiveDialogInstance: (match: any, currentDialogInstance: DialogInstance, activeDialogInstance?: DialogInstance) => Observizeable<void>;
}

interface IDialogResponderMatch {
    dialogResponse: any;
}

interface DialogResponder<M extends Match = any> {
    (match: M & IDialogMatch & IDialogResponderMatch): Observizeable<void>;
}

interface DialogResponders<M extends Match = any> {
    [name: string]: DialogResponder<M>;
}

export class Dialogs<M extends Match = any> {
    private dialogs: {
        [name: string]: IDialog<M & IDialogMatch>;
    }

    constructor(private dialogStack: DialogStack) {
    }

    add(name: string, dialog: IDialog<M & IDialogMatch>) {
        if (this.dialogs[name]) {
            console.warn(`You attempted to add a dialog named "${name}" but a dialog with that name already exists.`);
            return;
        }
        this.dialogs[name] = dialog;
    }

    addRule(name: string, rule: IRule<M & IDialogMatch>) {
        this.add(name, {
            invoke: () => Observable.of("shared instance"),
            tryMatch: (dialogInstance: DialogInstance, match: M & IDialogMatch) => rule.tryMatch(match)
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
                .flatMap(dialog => dialog.invoke(args))
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
            addDialogTask = this.addDialogTask as any as (
                tasks: DialogTask[],
                match: ANYMATCH & IDialogMatch,
                parentDialogInstance: DialogInstance,
                name?: string,
                args?: any
            ) => void;
        
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
                return (
                    match.currentDialogInstance
                        ? observize(dialogStack.getActiveDialogInstance(match, match.currentDialogInstance))
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
                                currentDialogInstance: activeDialogInstance,
                                beginChildDialog: (name: string, args?: any) => addDialogTask(tasks, match, activeDialogInstance, name, args),
                                replaceThisDialog: match.currentDialogInstance
                                    ? (name: string, args?: any) => addDialogTask(tasks, match, match.currentDialogInstance, name, args)
                                    : () => console.warn("You cannot replace the root dialog"),
                                endThisDialog: match.currentDialogInstance
                                    ? (args?: any) => {
                                        addDialogTask(tasks, match, activeDialogInstance);
                                        if (responder)
                                            tasks.push(() => observize(responder({
                                                ... match as any,
                                                dialogResponse: args
                                            })));
                                    }
                                    : () => console.warn("You cannot end the root dialog"),
                                clearChildDialog: () => addDialogTask(tasks, match, match.currentDialogInstance || activeDialogInstance),
                            })
                            .flatMap(ruleResult =>
                                Observable.from(tasks)
                                    .flatMap(task => task(), 1)
                                    .count()
                                    .map(_ => ruleResult)
                            )
                    });
            }
        }(args) as IRule<ANYMATCH>
    }
}

export class RemoteDialogs<M extends Match = any> {
    constructor(
        private matchRemoteDialog: (match: M & IDialogMatch) => any,
        private handleSuccessfulResponse: (response: any) => Observizeable<void>
    ) {
    }

    dialog(
        remoteUrl: string
    ): IDialog<M & IDialogMatch> {
        return {
            invoke: (name: string, args: any) =>
                Observable.fromPromise(
                        fetch(
                            remoteUrl + "/invoke", {
                                method: 'POST',
                                body: {
                                    name,
                                    args
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

interface DialogInstances {
    newInstance: (name: string, dialogData: any) => Observizeable<string>,
    getDialogData: (dialogInstance: DialogInstance) => Observizeable<any>,
    setDialogData: (dialogInstance: DialogInstance, dialogData?: any) => Observizeable<void>
}

export class LocalDialogs<M extends Match = any> {
    constructor(private dialogInstances: DialogInstances) {
    }

    dialog<DIALOGDATA = undefined, ARGS = any>(
        rule: IRule<M & IDialogMatch & IDialogStateMatch<DIALOGDATA>>,
        init?: (args: ARGS) => DIALOGDATA
    ): IDialog<M & IDialogMatch> {
        return {
            invoke: (name: string, args?: ARGS) =>
                (init ? observize(init(args)) : Observable.of({}))
                    .flatMap(dialogData => observize(this.dialogInstances.newInstance(name, dialogData))),

            tryMatch: (dialogInstance: DialogInstance, match: M) =>
                observize(this.dialogInstances.getDialogData(dialogInstance) as DIALOGDATA)
                    .flatMap(dialogData =>
                        rule.tryMatch({
                            ... match as any,
                            dialogData
                        })
                        .flatMap(ruleResult =>
                            observize(this.dialogInstances.setDialogData(dialogInstance, dialogData))
                            .map(_ => ruleResult)
                        )
                    )
        }
    }
}

// Sample implementation

const dialogStack: {
    [name: string]: DialogInstance;
} = {};

const ds = {
    getActiveDialogInstance: (match: any, currentDialogInstance: DialogInstance) =>
        dialogStack[match.currentDialogInstance.name],
    setActiveDialogInstance: (match: any, currentDialogInstance: DialogInstance, activeDialogInstance?: DialogInstance) => {
        dialogStack[match.currentDialogInstance.name] = activeDialogInstance
    }
}

interface IGameMatch extends Match {
    text: string;
    reply: (text: string) => void;
}

const dialogs = new Dialogs<IGameMatch>(ds);

const dialogDataStorage: {
    [name: string]: any[];
} = {};

const dialogInstances: DialogInstances = {
    newInstance: (name: string, dialogData: any = {}) => {
            if (!dialogDataStorage[name])
                dialogDataStorage[name] = [];
            return (dialogDataStorage[name].push(dialogData) - 1).toString();
        },
    getDialogData: (dialogInstance: DialogInstance) =>
        dialogDataStorage[dialogInstance.name][dialogInstance.instance],
    setDialogData: (dialogInstance: DialogInstance, dialogData?: any) => {
        dialogDataStorage[dialogInstance.name][dialogInstance.instance] = dialogData;
    }
}

import { first } from './Rules';
import { re } from './RegExp';

const local = new LocalDialogs<IGameMatch>(dialogInstances);
const gameDialog = local.dialog<{
    num: number;
}>(
    first(
        dialogs.runIfActive(),
        re(/stocks/, m => m.beginChildDialog('stocks')),
        re(/answer/, m => m.reply(`The answer is ${m.dialogData.num}`)),
        m => m.endThisDialog("foo")
    ),
    () => ({ num: Math.random() * 100 })
);

dialogs.add('game', gameDialog);
dialogs.addRule('stocks', first(

));

dialogs.addRule('/', first(
    re(/cancel/, m => m.clearChildDialog()),
    re(/time/, m => m.reply(`the time is ${Date.now}`)),
    dialogs.runIfActive('game', m => m.reply(`The name of the game is ${m.dialogResponse}`)),
    re(/start game/, m => m.beginChildDialog('game')),
));

const appRule: IRule<IGameMatch> = dialogs.runIfActive();
