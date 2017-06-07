import { Match, IRule, BaseRule, RuleResult, Observizeable, observize } from './Rules';
import { Observable } from 'rxjs';
import { ITextMatch } from './Text';
import { konsole } from './Konsole';

interface IDialog<M extends IDialogMatch = any> {
    invoke?(args: any): Observable<string>;
    tryMatch(m: M, instance: string): Observable<RuleResult>;
}

interface IDialogMatch<M extends IDialogMatch = any> {
}

interface ActiveDialog {
    name: string;
    instance: string;
}

function isDialog<M>(dialog: IDialog<M> | IRule<M>): dialog is IDialog<M> {
    return ((dialog as any).tryMatch !== undefined);
}

export class Dialogs<M extends IDialogMatch = any> extends BaseRule<M> {
    private dialogs: {
        [name: string]: IDialog<M>;
    }

    constructor(
        private getActiveDialog: (match: M) => Observizeable<ActiveDialog>,
        private setActiveDialog: (match: M, activeDialog?: ActiveDialog) => Observizeable<void>
    ) {
        super();
    }

    add(name: string, dialog: IDialog<M> | IRule<M>) {
        if (this.dialogs[name]) {
            console.warn(`You attempted to add a dialog named "${name}" but a dialog with that name already exists.`);
            return;
        }
        if (!isDialog(dialog))
            dialog = new SimpleDialog(this, dialog);

        this.dialogs[name] = dialog;
    }

    invoke(name: string, args?: any) {
        return Observable.of("instance");
        // return observize(this.getActiveDialog(m))
    }

    tryMatch(m: M): Observable<RuleResult> {
        return observize(this.getActiveDialog(m))
            .flatMap(activeDialog => {
                const dialog = this.dialogs[activeDialog.name];
                if (!dialog) {
                    console.warn(`A dialog named "${activeDialog.name}" doesn't exist.`);
                    return Observable.empty<RuleResult>();
                }
                return dialog.tryMatch(m, activeDialog.instance);
            });
    }
}

class SimpleDialog<M extends IDialogMatch = any> implements IDialog<M> {
    constructor(private dialogs: Dialogs<M>, private rule: IRule<M>) {
    }

    invoke() {
        return Observable.of("id");
    }

    tryMatch(m: M, instance: string) {
        // do something with instance
        return this.rule.tryMatch(m);
    }
}

class RemoteDialog<M extends IDialogMatch = any> implements IDialog<M> {
    constructor(private dialogs: Dialogs<M>, public remoteUrl: string) {
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
