import { runNodeConsole, INodeConsoleMatch, Helpers, RegExpHelpers, LuisModel } from '../src/prague';

const { first, run } = Helpers<INodeConsoleMatch>();
const { re } = RegExpHelpers<INodeConsoleMatch>();
const luis = new LuisModel<INodeConsoleMatch>("id", "key");

runNodeConsole(
    first(
        run(match => match.reply(`You said ${match.text}`)),
        re(/I am (.*)/, match => match.reply(`Hi there, ${match.groups[1]}!`)),
        luis.best(
            luis.rule('singASong', match => match.reply(`Okay, let's sing ${match.entityValues('song')[0]}!`)),
            luis.rule('findSomething', match => match.reply(`Okay, let's look for ${match.entityValues('what')[0]} in ${match.entityValues('where')[0]}!`))
        ),
    )
);
