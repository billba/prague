import { Store } from 'redux';
import { IStateInput } from './State';

export interface IReduxInput<APP, BOTDATA> extends IStateInput<BOTDATA> {
    state: APP;
    store: Store<APP>;
    getBotData: (state: APP) => BOTDATA;
}
