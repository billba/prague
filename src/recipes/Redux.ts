import { Store } from 'redux';
import { Match } from '../Rules';
import { IStateMatch } from './State';

export interface IReduxMatch<APP, BOTDATA> extends IStateMatch<BOTDATA> {
    state: APP;
    store: Store<APP>;
    getBotData: (state: APP) => BOTDATA;
}

export const matchReduxState = <APP, BOTDATA>(
    store: Store<APP>,
    getBotData: (state: APP) => BOTDATA
) => <M extends Match>(match: M) => {
    console.log("ReduxChat", this.store);
    const state = store.getState();

    return {
        ... match as any, // remove "as any" when TypeScript fixes this bug

        // IReduxMatch
        data: getBotData(state),
        store: store,
        state,
        getBotData: getBotData,
    } as M & IReduxMatch<APP, BOTDATA>;
}