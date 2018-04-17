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

```ts
const botLogic = (text: string) => p
    .first(
        p.ifGet(/I am (.*)/i.exec(text),
            matches => new p.DoRoute(() => bot.send(`Nice to meet you, ${matches[1]}`));
        ),

        p.ifGet(/What's the weather like today?/i.exec(text),
            () => new p.DoRoute(() => bot.send(`It's Seattle, so let's say "rainy"`));
        ),

        () => new p.DoRoute(() => bot.send(`I don't understand you. It's not me, it's you.`));
    )
    .do();
```

```ts
const botLogic = (text: string) => p
    .first(
        p.ifGet(/I am (.*)/i.exec(text),
            matches => p.do(() => bot.send(`Nice to meet you, ${matches[1]}`));
        ),

        p.ifGet(/What's the weather like today?/i.exec(text),
            p.do(() => bot.send(`It's Seattle, so let's say "rainy"`));
        ),

        p.do(()) => bot.send(`I don't understand you. It's not me, it's you.`));
    )
    .do();
```

```ts
const botLogic = (text: string) => p
    .first(
        p.ifGet(/I am (.*)/i.exec(text),
            p.do(matches => bot.send(`Nice to meet you, ${matches[1]}`));
        ),

        p.ifGet(/What's the weather like today\?/i.exec(text),
            p.do(() => bot.send(`It's Seattle, so let's say "rainy"`));
        ),

        p.do(()) => bot.send(`I don't understand you. It's not me, it's you.`));
    )
    .do();
```



# Today's approach

Start with:

```ts
const botLogic = (c: BotContext) => {
    const matches = /I am (.*)/i.exec(c.request.text);
    if (matches)
        c.reply(`Nice to meet you, ${matches[1]}`);
}
```


```ts
const botLogic = (c: BotContext) => {
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

```ts
const botLogic = (c: BotContext) => {
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

```ts
const botLogic = (c: BotContext) => {
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

```ts
const botLogic = (c: BotContext) => {
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

```ts
const botLogic = (c: BotContext) => {
    p.Router
        .from(() => {
            const matches = /I am (.*)/i.exec(c.request.text));
            if (matches)
                return MatchRoute(matches);
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

```ts
const botLogic = (c: BotContext) => {
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

```ts
const botLogic = (c: BotContext) => {
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

```ts
const botLogic = (c: BotContext) => {
    p.Router
        .from(() => /I am (.*)/i.exec(c.request.text))
        .mapByType({
            match: matchRoute => new DoRoute(() => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
        })
        .do();
}
```

```ts
const botLogic = (c: BotContext) => {
    p.match(() => /I am (.*)/i.exec(c.request.text),
        matchRoute => new DoRoute(() => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
    })
    .do();
}
```

```ts
const botLogic = (c: BotContext) => {
    p.match(() => /I am (.*)/i.exec(c.request.text),
        matchRoute => p.do(() => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
    })
    .do();
}
```

```tsx
const botLogic = (c: BotContext) => {
    p.match(() => /I am (.*)/i.exec(c.request.text),
        p.do(matchRoute => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
    })
    .do();
}
```

Now add stuff

```tsx
const botLogic = (c: BotContext) => {
    p
        .first(
            p.ifGet(() => /I am (.*)/i.exec(c.request.text),
                p.do(matchRoute => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
            }),
            p.ifGet(() => /time/.exec(c.request.text),
                p.do(() => c.reply(`It is ${new Date().toString()}`))
            )
        )
        .mapByType({ 
            no: p.do(() => c.reply("I don't understand you"))
        })
        .do();
}
```

```ts
const botLogic = (c: BotContext) => {
    p
        .first(
            p.ifGet(() => /I am (.*)/i.exec(c.request.text),
                p.do(matchRoute => c.reply(`Nice to meet you, ${matchRoute.value[1]}`));
            }),
            p.ifGet(() => /time/.exec(c.request.text),
                p.do(() => c.reply(`It is ${new Date().toString()}`))
            )
        )
        .default( 
            p.do(() => c.reply("I don't understand you"))
        )
        .do();
}
```

```ts 
const botLogic = (c: BotContext) => {
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