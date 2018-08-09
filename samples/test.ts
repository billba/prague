import { Match, first, pipe, run, match, if as _if } from '../src/xform';
import { re } from '../src/util';

// const actions = new p.NamedActions(() => ({
//     greeting(name: string) {
//         console.log(`Nice to meet you, ${name}`);
//     },
//     farewell() {
//         console.log(`Goodbye`);
//     },
// }));

// _if looks for a truthy result and doesn't capture any matches
const askTime = _if(
    (t: string) => t === "time", 
    () => () => console.log(`The time is ${new Date().toLocaleDateString()}`),
);

const introduction = match(
    pipe(
        first(
            re(/My name is (.*)/),
            re(/Je m'appelle (.*)/),
        ),
        r => r instanceof Match ? r.value[1] : r,
    ),
    r => () => console.log(`Nice to meet you, ${r.value}`),
);

const app = pipe(
    first(
        askTime,
        introduction,
    ),
    run,
);

app("My name is Bill")
    .subscribe(r => console.log("result", r));
