import * as p from '../src/prague';

const greeter = p.first(
    p.match(
        p.first(
            p.re(/my name is (.*)/i),
            p.re(/je m'appelle (.*)/i)
        ),
        p.do(matches => {
            console.log(`Nice to meet you, ${matches.value![1]}`);
        })
    ),
    p.do(() => { console.log("I didn't catch that.") }),
);

greeter.do("Aloha");
greeter.do("My name is Bill");
greeter.do("Je m'appelle Guillaume");
