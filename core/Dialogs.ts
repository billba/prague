import { Match, IRule, BaseRule, RuleResult, Observizeable, observize } from './Rules';
import { Observable } from 'rxjs';
import { konsole } from './Konsole';

interface DialogInstance {
    name: string;
    instance: string;
}

interface IDialogMatch {
    currentDialog?: DialogInstance;
    activeDialog?: DialogInstance;
    beginDialog(name: string, args?: any): void;
    replaceDialog(name: string, args?: any): void;
    endDialog(): void;
    clearDialogs(): void;
}

interface IDialog<M extends IDialogMatch = any> {
    invoke(args?: any): Observable<string>;
    tryMatch(match: M, instance: string): Observable<RuleResult>;
}

function isDialog<M extends IDialogMatch = any>(dialog: IDialog<M> | IRule<M>): dialog is IDialog<M> {
    return ((dialog as any).invoke !== undefined);
}

export class Dialogs<M extends Match = any> extends BaseRule<M> {
    private dialogs: {
        [name: string]: IDialog<M & IDialogMatch>;
    }

    constructor(
        private getActiveDialog: (match: M) => Observizeable<DialogInstance>,
        private setActiveDialog: (match: M, activeDialog?: DialogInstance) => Observizeable<void>
    ) {
        super();
    }

    matchDialog(match: M, currentDialog: string) {
        return match && {
            ... match as any,
            // currentDialog,
            beginDialog: (name: string, args?: any) => this.beginDialog(match, name, args),
            // endDialog:
        } as M & IDialogMatch
    }

    add(name: string, dialog: IDialog<M & IDialogMatch> | IRule<M & IDialogMatch>) {
        if (this.dialogs[name]) {
            console.warn(`You attempted to add a dialog named "${name}" but a dialog with that name already exists.`);
            return;
        }
        if (!isDialog(dialog))
            dialog = new SimpleDialog(dialog);

        this.dialogs[name] = dialog;
    }

    beginDialog(match: M, name: string, args?: any) {
        return Observable.of("instance");
        // return observize(this.getActiveDialog(m))
    }

    tryMatch(match: M): Observable<RuleResult> {
        return 
        
        observize(this.getActiveDialog(match))
            .flatMap(activeDialog => {
                const dialog = this.dialogs[activeDialog.name];
                if (!dialog) {
                    console.warn(`A dialog named "${activeDialog.name}" doesn't exist.`);
                    return Observable.empty<RuleResult>();
                }
                return dialog.tryMatch(this.matchDialog(match, activeDialog.name), activeDialog.instance);
            });
    }
}

class SimpleDialog<M extends IDialogMatch = any> implements IDialog<M> {
    constructor(private rule: IRule<M>) {
    }

    invoke() {
        return Observable.of("id");
    }

    tryMatch(m: M, instance: string) {
        // do something with instance
        return this.rule.tryMatch(m);
    }
}

export class Remote<M extends IDialogMatch = any> {
    constructor(private matchRemoteDialog: (match: M) => any) {
    }

    dialog(remoteUrl: string): IDialog<M> {
        return new RemoteDialog<M>(remoteUrl, this.matchRemoteDialog);
    }
}

export class RemoteDialog<M extends IDialogMatch = any> implements IDialog<M> {
    constructor(private remoteUrl: string, private matchRemoteDialog: (match: M) => any) {
    }

    invoke(args: any) {
        return Observable.fromPromise(
                fetch(
                    this.remoteUrl + "/invoke", {
                        method: 'POST',
                        body: args
                    }
                )
                .then(response => response.json())
            )
            .catch(error => {
                konsole.log("Network error calling remote invoke()", error);
                return Observable.empty();
            })
            .flatMap(json => {
                switch (json.status) {
                    case 'success':
                        return Observable.of(json.instance);
                    case 'error':
                        return Observable.throw(`RemoteDialog.invoke() returned error "${json.error}".`);
                    default:
                        return Observable.throw(`RemoteDialog.invoke() returned unexpected status "${json.status}".`);
                }
            });
    }

    tryMatch(match: M, instance: string) {
        // here we need to do some major surgery on match
        // get rid of all the methods, for example
        return Observable.fromPromise(
                fetch(
                    this.remoteUrl + "/tryMatch", {
                        method: 'POST',
                        body: {
                            match,
                            instance
                        }
                    }
                )
                .then(response => response.json())
            )
            .catch(error => {
                konsole.log("Network error calling remote tryMatch()", error);
                return Observable.empty();
            })
            .flatMap(json => {
                switch (json.status) {
                    case 'endWithResult':
                        // end dialog, then fall through
                    case 'result':
                        return Observable.of(json.ruleResult);
                    case 'matchless':
                        return Observable.empty();
                    case 'error':
                        return Observable.throw(`RemoteDialog.tryMatch() returned error "${json.error}".`);
                    default:
                        return Observable.throw(`RemoteDialog.tryMatch() returned unexpected status "${json.status}".`);
                }
            });
    }
}
