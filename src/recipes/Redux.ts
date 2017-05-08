import { Store } from 'redux';
import { IStateMatch } from './State';

export interface IReduxMatch<APP, BOTDATA> extends IStateMatch<BOTDATA> {
    state: APP;
    store: Store<APP>;
    getBotData: (state: APP) => BOTDATA;
}
