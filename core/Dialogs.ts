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
    beginDialog(name: string, args?: any): void;
    replaceDialog(name: string, args?: any): void;
    endDialog(): void;
    clearDialog(): void;
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

export class Dialogs<M extends Match = any> {
    private dialogs: {
        [name: string]: IDialog<M & IDialogMatch>;
    }

    private dialogRule: IRule<M>;

    constructor(
        private getActiveDialogInstance: (match: any, currentDialogInstance: DialogInstance) => Observizeable<DialogInstance>,
        private setActiveDialogInstance: (match: any, currentDialogInstance: DialogInstance, activeDialogInstance?: DialogInstance) => Observizeable<void>,
    ) {
        const dialogs = this.dialogs,
            beginDialog = this.beginDialog,
            clearDialog = this.clearDialog;
        
        this.dialogRule = new class extends BaseRule<M & IDialogMatch> {
            constructor() {
                super();
            }
            tryMatch(match: M & IDialogMatch): Observable<RuleResult> {
                return (
                    match.currentDialogInstance
                        ? observize(getActiveDialogInstance(match, match.currentDialogInstance))
                        : Observable.of(rootDialogInstance)
                    )
                    .flatMap(activeDialogInstance => {
                        const dialog = dialogs[activeDialogInstance.name];
                        if (!dialog) {
                            console.warn(`A dialog named "${activeDialogInstance.name}" doesn't exist.`);
                            return Observable.empty<RuleResult>();
                        }
                        const tasks: DialogTask[] = [];
                        return dialog.tryMatch(activeDialogInstance, {
                                ... match as any,
                                currentDialogInstance: activeDialogInstance,
                                beginDialog: (name: string, args?: any) => beginDialog(tasks, match, activeDialogInstance, name, args),
                                replaceDialog: match.currentDialogInstance
                                    ? (name: string, args?: any) => {
                                            clearDialog(tasks, match, match.currentDialogInstance);
                                            beginDialog(tasks, match, match.currentDialogInstance, name, args);
                                        }
                                    : () => console.warn("You cannot replace the root dialog"),
                                endDialog: match.currentDialogInstance
                                    ? () => clearDialog(tasks, match, activeDialogInstance)
                                    : () => console.warn("You cannot end the root dialog"),
                                clearDialog: () => clearDialog(tasks, match, match.currentDialogInstance || activeDialogInstance),
                            })
                            .flatMap(ruleResult =>
                                Observable.from(tasks)
                                    .flatMap(task => task(), 1)
                                    .count()
                                    .map(_ => ruleResult)
                            )
                    });
            }
        }
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

    invoke(name: string, match: M & IDialogMatch, args?: any): Observable<void> {
        return ;
    }

    private beginDialog(
        tasks: DialogTask[],
        match: M & IDialogMatch,
        parentDialogInstance: DialogInstance,
        name: string,
        args?: any
    ) {
        const dialog = this.dialogs[name];
        if (!dialog) {
            console.warn(`You attempted to begin a dialog named "${name}" but no dialog with that name exists.`);
            return;
        }

        tasks.push(() => Observable.of(dialog)
            .flatMap(dialog => dialog.invoke(args))
            .flatMap(instance => observize(this.setActiveDialogInstance(match, parentDialogInstance, { name, instance })))
        );
    }

    private clearDialog(tasks: DialogTask[], match: M & IDialogMatch, parentDialogInstance: DialogInstance) {
        tasks.push(() => observize(this.setActiveDialogInstance(match, parentDialogInstance)));
    }

    rule<ANYMATCH extends Match = M>(): IRule<ANYMATCH> {
        return this.dialogRule as any as IRule<ANYMATCH>;
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

export class LocalDialogs<M extends Match = any> {
    constructor(
        private newDialogInstance: (name: string, dialogData: any) => Observizeable<string>,
        private getDialogData: (dialogInstance: DialogInstance) => Observizeable<any>,
        private setDialogData: (dialogInstance: DialogInstance, dialogData?: any) => Observizeable<void>
    ) {
    }

    dialog<DIALOGDATA = undefined, ARGS = any>(
        rule: IRule<M & IDialogMatch & IDialogStateMatch<DIALOGDATA>>,
        init?: (args: ARGS) => DIALOGDATA
    ): IDialog<M & IDialogMatch> {
        return {
            invoke: (name: string, args?: ARGS) =>
                (init ? observize(init(args)) : Observable.of({}))
                    .flatMap(dialogData => observize(this.newDialogInstance(name, dialogData))),

            tryMatch: (dialogInstance: DialogInstance, match: M) =>
                observize(this.getDialogData(dialogInstance) as DIALOGDATA)
                    .flatMap(dialogData =>
                        rule.tryMatch({
                            ... match as any,
                            dialogData
                        })
                        .flatMap(ruleResult =>
                            observize(this.setDialogData(dialogInstance, dialogData))
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

const getActiveDialogInstance = (match: any, currentDialogInstance: DialogInstance) =>
    dialogStack[match.currentDialogInstance.name];
const setActiveDialogInstance = (match: any, currentDialogInstance: DialogInstance, activeDialogInstance?: DialogInstance) => {
    dialogStack[match.currentDialogInstance.name] = activeDialogInstance;
}

interface IGameMatch extends Match {
    text: string;
    reply: (text: string) => void;
}

const dialogs = new Dialogs<IGameMatch>(getActiveDialogInstance, setActiveDialogInstance);

const dialogDataStorage: {
    [name: string]: any[];
} = {};

const newDialogInstance = (name: string, dialogData: any = {}) => {
    if (!dialogDataStorage[name])
        dialogDataStorage[name] = [];
    return (dialogDataStorage[name].push(dialogData) - 1).toString();
}

const getDialogData = (dialogInstance: DialogInstance) =>
    dialogDataStorage[dialogInstance.name][dialogInstance.instance];

const setDialogData = (dialogInstance: DialogInstance, dialogData?: any) => {
    dialogDataStorage[dialogInstance.name][dialogInstance.instance] = dialogData;
}

import { first } from './Rules';
import { re } from './RegExp';

const local = new LocalDialogs<IGameMatch>(newDialogInstance, getDialogData, setDialogData);
const gameDialog = local.dialog<{
    num: number;
}>(
    first(
        dialogs.rule(),
        re(/stocks/, m => m.beginDialog('stocks')),
        re(/answer/, m => m.reply(`The answer is ${m.dialogData.num}`)),
    ),
    () => ({ num: Math.random() * 100 })
);

dialogs.add('game', gameDialog);
dialogs.addRule('stocks', first(

));

dialogs.addRule('/', first(
    re(/cancel/, m => m.clearDialog()),
    re(/time/, m => m.reply(`the time is ${Date.now}`)),
    dialogs.rule(),
    re(/start game/, m => m.beginDialog('game')),
));

const appRule: IRule<IGameMatch> = dialogs.rule();
