import { first, run, match, matchIf, best, re, ActionReferences, Scored } from '../src/prague';

// matchIf looks for a truthy result and doesn't capture any matches
const askTime = matchIf(
    (t: string) => t === "time", 
    () => () => console.log(`The time is ${new Date().toLocaleDateString()}`),
);

// const askTime = (t: string) => {
//     if (t === "time")
//       return () => console.log(`The time is ${new Date().toLocaleDateString()}`);
//   }
  

const giveName = match(
    first(
        re(/My name is (.*)/),
        re(/Je m'appelle (.*)/),
    ),
    ([name]) => name,
); 

const sayGoodbye = first(
    re(/farewell/i),
    re(/adios/i),
    re(/bye/i),
);

const introduction = match(
    giveName,
    name => () => console.log(`Nice to meet you, ${name}`),
);

const app = first(
    askTime,
    introduction,
    t => () => console.log(`I don't understand "${t}"`),
);

const greetings = [
    "My name is Bill",
    "Je m'appelle Bill",
    "time",
    "I'm Bill",
];

greetings.map(t =>
    run(app)(t).subscribe()
)

console.log("*** Scoring ***");

best(
    () => Scored.from("bill", .85),
    () => Scored.from("fred", .50),
    () => Scored.from("joe", .85),
)()
.subscribe(console.log)

console.log("*** Named Actions ***");

const actions = new ActionReferences((send: (...args: any[]) => void) => ({
    greeting: (name: string) => {
        send(`Nice to meet you, ${name}`);
        return Promise.resolve();
    },
    farewell: () => {
        send(`Goodbye`);
    },
}));

const intro = match(
    giveName,
    name => actions.reference.greeting(name),
);

const outro = matchIf(
    sayGoodbye,
    () => actions.reference.farewell(),
)

const namedActionApp = actions.run(
    first(
        intro,
        outro,
    ),
    console.log,
);

["My name is Inigo Montoyez, prepare to die", "bye bye"].forEach(t => namedActionApp(t)
    .subscribe()
);
