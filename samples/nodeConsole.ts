import { runNodeConsole, INodeConsoleMatch, Helpers, RegExpHelpers } from '../src/prague';

const { first, run } = Helpers<INodeConsoleMatch>();
const { re } = RegExpHelpers<INodeConsoleMatch>();

runNodeConsole(first(
    run(match => console.log("match", match)),
    re(/I am (.*)/, match => match.reply(`Hi there, ${match.groups[1]}!`))
));
