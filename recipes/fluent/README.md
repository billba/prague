# [Prague](https://github.com/billba/prague) recipe for a fluent API. Usually a building block for something like [prague-botbuilder](https://github.com/billba/prague/recipes/botbuilder)).

## To install
`npm install -S prague-fluent`

## To use
```ts
import { Helpers } from 'prague-fluent';
const { tryInOrder, ifMatches, ifTrue, ifMessage, ifText, ifRegExp } = new Helpers<YOUR_ROUTABLE_FORMAT>();

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

let routable: YOUR_ROUTABLE_FORMAT = { /* set up object here */ }
router
    .route(routable)
    .then(routed => console.log("routed", routed));

```