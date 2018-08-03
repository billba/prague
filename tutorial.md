Some simple bot logic.

```ts
const botLogic = (text: string) => {
    let matches = /I am (.*)/i.exec(text);

    if (matches) {
        bot.send(`Nice to meet you, ${matches[1]}`);
    } else {
        let matches = /What's the weather like today?/i.exec(text);

        if (matches) {
            bot.send(`It's Seattle, so let's say "rainy"`);
        } else {
            bot.send(`I don't understand you. It's not me, it's you.`);
        }
    }
}
```

instead of *doing* the actions, package them into a closure:

```ts
const botLogic = (text: string) => {
    let action;
    let matches = /I am (.*)/i.exec(text);

    if (matches) {
        action = () => bot.send(`Nice to meet you, ${matches[1]}`);
    } else {
        let matches = /What's the weather like today?/i.exec(text);

        if (matches) {
            action = () => bot.send(`It's Seattle, so let's say "rainy"`);
        } else {
            action = () => bot.send(`I don't understand you. It's not me, it's you.`);
        }
    }
    if (action)
        action();
}
```

Let's do the same thing with the logic itself:

```ts
const botLogic = (text: string) => [
        () => {
            let matches = /I am (.*)/i.exec(text);

            if (matches)
                return () => bot.send(`Nice to meet you, ${matches[1]}`);
        },

        () => {
            let matches = /What's the weather like today?/i.exec(text);

            if (matches)
                return () => bot.send(`It's Seattle, so let's say "rainy"`);
        },

        () => () => bot.send(`I don't understand you. It's not me, it's you.`);
    ]
    .forEach(rule => {
        let action = rule();
        if (action) {
            return action();
        }
    });
```

replace ad-hoc 

```ts
const botLogic = (text: string) => [
        () => {
            let matches = /I am (.*)/i.exec(text);

            if (matches)
                return new p.DoRoute(() => bot.send(`Nice to meet you, ${matches[1]}`));
        },

        () => {
            let matches = /What's the weather like today?/i.exec(text);

            if (matches)
                return new p.DoRoute(() => bot.send(`It's Seattle, so let's say "rainy"`));
        },

        () => new p.DoRoute(() => bot.send(`I don't understand you. It's not me, it's you.`));
    ]
    .forEach(rule => {
        let route = rule();
        if (route) {
            return route.do();
        }
    });
```

introducing `first`

```ts
const botLogic = (text: string) => p
    .first(
        () => {
            let matches = /I am (.*)/i.exec(text);
            if (matches)
                return new p.DoRoute(() => bot.send(`Nice to meet you, ${matches[1]}`));
        },

        () => {
            let matches = /What's the weather like today?/i.exec(text);
            if (matches)
                return new p.DoRoute(() => bot.send(`It's Seattle, so let's say "rainy"`));
        },

        () => new p.DoRoute(() => bot.send(`I don't understand you. It's not me, it's you.`));
    )
    .route()
    .then(route => route.do());
```

last bit can be replaced with `do`

```ts
const botLogic = (text: string) => p
    .first(
        () => {
            let matches = /I am (.*)/i.exec(text);
            if (matches)
                return new p.DoRoute(() => bot.send(`Nice to meet you, ${matches[1]}`));
        },

        () => {
            let matches = /What's the weather like today?/i.exec(text);
            if (matches)
                return new p.DoRoute(() => bot.send(`It's Seattle, so let's say "rainy"`));
        },

        () => new p.DoRoute(() => bot.send(`I don't understand you. It's not me, it's you.`));
    )
    .do();
```

create router for each match

```ts
const botLogic = (text: string) => p
    .first(
        Router
            .from(() => /I am (.*)/i.exec(text))
            .map(route => {
                if (route instanceof MatchRoute)
                    return new p.DoRoute(() => bot.send(`Nice to meet you, ${matches[1]}`));
            }),

        Router
            .from(() => /What's the weather like today?/i.exec(text))
            .map(route => {
                if (route instanceof MatchRoute)
                    return new p.DoRoute(() => bot.send(`It's Seattle, so let's say "rainy"`));
            }),

        () => new p.DoRoute(() => bot.send(`I don't understand you. It's not me, it's you.`));
    )
    .do();
```

custom Router.from(match function) function becomes `match`

```ts
const botLogic = (text: string) => p
    .first(
        p.match(/I am (.*)/i.exec(text),
            matches => new p.DoRoute(() => bot.send(`Nice to meet you, ${matches[1]}`));
        ),

        p.match(/What's the weather like today?/i.exec(text),
            () => new p.DoRoute(() => bot.send(`It's Seattle, so let's say "rainy"`));
        ),

        () => new p.DoRoute(() => bot.send(`I don't understand you. It's not me, it's you.`));
    )
    .do();
```

use factory method `p.do` instead of `new p.Do`

```ts
const botLogic = (text: string) => p
    .first(
        p.match(/I am (.*)/i.exec(text),
            matches => p.do(() => bot.send(`Nice to meet you, ${matches[1]}`));
        ),

        p.match(/What's the weather like today?/i.exec(text),
            p.do(() => bot.send(`It's Seattle, so let's say "rainy"`));
        ),

        p.do(()) => bot.send(`I don't understand you. It's not me, it's you.`));
    )
    .do();
```

simplified usage of `p.do` with param

```ts
const botLogic = (text: string) => p
    .first(
        p.match(/I am (.*)/i.exec(text),
            p.do(matches => bot.send(`Nice to meet you, ${matches[1]}`));
        ),

        p.match(/What's the weather like today\?/i.exec(text),
            p.do(() => bot.send(`It's Seattle, so let's say "rainy"`));
        ),

        p.do(()) => bot.send(`I don't understand you. It's not me, it's you.`));
    )
    .do();
```



# Today's approach

Start with:

```ts
const botLogic = (c: TurnContext) => {
    const matches = /I am (.*)/i.exec(c.request.text);
    if (matches)
        c.reply(`Nice to meet you, ${matches[1]}`);
}
```

Defer execution of action and rules:

```ts
const botLogic = (c: TurnContext) => {
    const router = () => {
        const matches = /I am (.*)/i.exec(c.request.text);
        if (matches)
            return {
                do: () => c.reply(`Nice to meet you, ${matches[1]}`);
            }
    }

    const route = router();

    if (route) {
        route.do();
    }
}
```

Simplify end logic by returning `NoRoute` instead of `undefined`.

```ts
const botLogic = (c: TurnContext) => {
    const router = () => {
        const matches = /I am (.*)/i.exec(c.request.text);
        if (matches)
            return new DoRoute(() => c.reply(`Nice to meet you, ${matches[1]}`));
        else
            return new NoRoute();
    }

    const route = router();

    route.do();
}
```

Introducing Prague via `p.Router.from()` and `.route()`

```ts
const botLogic = (c: TurnContext) => {
    p.Router
        .from(() => {
            const matches = /I am (.*)/i.exec(c.request.text);
            if (matches)
                return new DoRoute(() => c.reply(`Nice to meet you, ${matches[1]}`));
            else
                return new NoRoute();
        })
        .route()
        .then(route => route.do());
}
```

Simplifies down to `.do`

```ts
const botLogic = (c: TurnContext) => {
    p.Router
        .from(() => {
            const matches = /I am (.*)/i.exec(c.request.text);
            if (matches)
                return new DoRoute(() => c.reply(`Nice to meet you, ${matches[1]}`));
            else
                return new NoRoute();
        })
        .do();
}
```

Separate out matching from action

```ts
const botLogic = (c: TurnContext) => {
    p.Router
        .from(() => {
            const matches = /I am (.*)/i.exec(c.request.text));
            if (matches)
                return new MatchRoute(matches);
            else
                return new NoRoute();

        })
        .map(route => {
            if (route instanceof MatchRoute)
                return new DoRoute(() => c.reply(`Nice to meet you, ${route.value[1]}`));
            else
                return route;
        })
        .do();
}
```

Don't need `NoRoute` (`Router.from` does this for us)

```ts
const botLogic = (c: TurnContext) => {
    p.Router
        .from(() => {
            const matches = /I am (.*)/i.exec(c.request.text));
            if (matches)
                return new MatchRoute(matches);
        })
        .map(route => {
            if (route instanceof MatchRoute)
                return new DoRoute(() => c.reply(`Nice to meet you, ${route.value[1]}`));
            else
                return route;
        })
        .do();
}
```

In fact, `Route.from` does matching for us too:

```ts
const botLogic = (c: TurnContext) => {
    p.Router
        .from(() => /I am (.*)/i.exec(c.request.text))
        .map(route => {
            if (route instanceof MatchRoute)
                return new DoRoute(() => c.reply(`Nice to meet you, ${route.value[1]}`));
            else
                return route;
        })
        .do();
}
```

`mapByType` is a simpler way of dealing with different route types: 

```ts
const botLogic = (c: TurnContext) => {
    p.Router
        .from(() => /I am (.*)/i.exec(c.request.text))
        .mapByType({
            match: matchRoute => new DoRoute(() => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
        })
        .do();
}
```

`match` looks out just for `Match` routes. 

```ts
const botLogic = (c: TurnContext) => {
    p.match(() => /I am (.*)/i.exec(c.request.text),
        matchRoute => new DoRoute(() => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
    })
    .do();
}
```

use `p.do` constructor instead of `new DoRoute`

```ts
const botLogic = (c: TurnContext) => {
    p.match(() => /I am (.*)/i.exec(c.request.text),
        matchRoute => p.do(() => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
    })
    .do();
}
```

Now we can bring the parameter inside:

```tsx
const botLogic = (c: TurnContext) => {
    p.match(() => /I am (.*)/i.exec(c.request.text),
        p.do(matchRoute => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
    })
    .do();
}
```

Now add more conditions:

```tsx
const botLogic = (c: TurnContext) => {
    p
        .first(
            p.match(() => /I am (.*)/i.exec(c.request.text),
                p.do(matchRoute => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
            }),
            p.match(() => /time/.exec(c.request.text),
                p.do(() => c.reply(`It is ${new Date().toString()}`))
            )
        )
        .mapByType({ 
            no: p.do(() => c.reply("I don't understand you"))
        })
        .do();
}
```

`default` looks out just for `No` routes. 

```ts
const botLogic = (c: TurnContext) => {
    p
        .first(
            p.match(() => /I am (.*)/i.exec(c.request.text),
                p.do(matchRoute => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
            }),
            p.match(() => /time/.exec(c.request.text),
                p.do(() => c.reply(`It is ${new Date().toString()}`))
            )
        )
        .default( 
            p.do(() => c.reply("I don't understand you"))
        )
        .do();
}
```

Now we're going to:
* use a helper for `regExp`
* templatize the actions

```ts 
const botLogic = (c: TurnContext) => {
    p
        .first(
            p.match(regExp(/I am (.*)/i, c),
                route => new p.TemplateRoute('greeting', route.value[1])
            ),
            p.match(regExp(/time/i, c),
                route => new p.TemplateRoute('time', new Date().toLocaleTimeString())
            ),
        )
        .mapByType({
            template: route => {
                switch (route.action) {
                    case 'greeting':
                        return p.do(() => c.reply(`Nice to meet you, ${route.args}`));
                    case 'time':
                        return p.do(() => c.reply(`The current time is ${route.args}`));
                }
            }
        })
        .default(
            p.do(() => c.reply(`I don't understand you humans.`))
        )
        .do();
}
```