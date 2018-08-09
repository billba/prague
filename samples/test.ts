import { Match, first, pipe, from, run, match, if as _if, best, defaultDisambiguator, re } from '../src/prague';

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

// const askTime = (t: string) => {
//     if (t === "time")
//       return () => console.log(`The time is ${new Date().toLocaleDateString()}`);
//   }
  
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
        t => () => console.log(`I don't understand "${t}"`),
    ),
);

[
    "My name is Bill",
    "Je m'appelle Bill",
    "time",
    "I'm Bill",
].map(t => pipe(
        app,
        run,
    )(t)
    .subscribe()
)

const options = pipe(
        best(
        () => new Match("bill", .85),
        () => new Match("fred", .50),
        () => new Match("joe", .85),
    ),
    defaultDisambiguator,
)()
.subscribe(console.log)
