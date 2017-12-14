# [Prague](https://github.com/billba/prague) recipe for writing apps using Microsoft BotBuilder 4.x.

## To install
`npm install -S prague-botbuilder`

## To use
```ts
import { tryInOrder, ifMatches, ifTrue, ifMessage, ifText, ifRegExp } from 'prague-botbuilder';

const router =
    ifMessage()
        .thenTry(
            tryInOrder(
                ifRegExp(/howdy|hi|hello/i).thenDo(c => c.reply(`Hello to you!`)),
                ifRegExp(/what time is it/).thenDo(c => c.reply(`It's showtime.`)),
                ifRegExp(/my name is (.*)/).thenDo((c, matches) => c.reply(`Nice to meet you, ${matches[1]}`))
            )
            .defaultDo(c => c.reply("I will never understand you humans"))
        )
        .elseDo(c => c.reply("non-message activity"))

const bot = new Bot(adapter)
    // add other middleware here
    .onReceive(c => router.route(c));

```