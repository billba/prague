# Prague 101

Prague allows you to write apps using the **message router** pattern.

Consider the universe of events that your app can respond to. Timers. Web Sockets. User actions. Text messages from the user - an infinite variety. Ditto for image, audio, and video input. Now consider the large set of actions your app can take in response to a given event. Any app can be thought of as a system (router) for connecting (routing) each event (message) to the most appropriate action (route). Your router could be simple, or very complex, depending on the requirements of your app and/or how you construct it.

Prague is a family of building blocks. You can construct your router using low-level primitives which allow you fine-grained control. Or you can take advantage of higher-level components which implement common patterns. Or you can build your own! And of course you can mix and match.

## Getting Started with Routing

To demonstrate Prague in action, we'll write a variety of bots. Prague itself is agnostic about the source, content, and format of the messages it routes, so for this example we'll use a hypothetical bot recipe implementing a simple message format that would apply to almost any bot system:

```typescript
interface Message {
    text: string;
    reply: (text: string) => void;
}
```

We're going to be building a router that can route these types of messages:

```typescript
import { IRouter } from 'prague';

let router: IRouter<Message>;
```

Our hypothetical bot wires this router up via a message pump, something like: 

```typescript
import { routeMessage } from 'prague';

bot.subscribe((message: Message) => routeMessage(router, message));
```

Let's start in classic style:

```typescript
import { simpleRouter } from 'prague';

router = simpleRouter(
    m => m.reply("Hello, World")
);
```

This function is aptly named - it creates a simple router that passes the message as the single parameter to the function provided. Thus every message is routed to the same action:

>
**Hey**  
*Hello, World*  
**Hello**  
*Hello, World*  

This is a friendly bot, but not a very clever one. Let's be a little more discriminating about when we greet the user by introducing a condition that must be satisfied before the action is taken:

```typescript
import { ifMatch } from 'prague';

router = ifMatch(
    m => m.text === "Hello" || m.text === "Hi" || m.text === "Wassup",
    m => m.reply("Hello, World"
)
```

`ifMatch` first passes the message to the first function. Only if it succeeds will it route the message to the second function:

>
**Hey**  
**Hello**  
*Hello, World*  

No bot is perfect, and there will always be user utterances we can't parse. But instead of ignoring them, it would we be nice if we acknowledged them in some way. We do this by introducing another function.  `first` takes a list of routers and tries a given message on each in turn, until one succeeds. While we're at it, we'll switch from string comparison to a case-insensitive Regular Expression test:

```typescript
import { first } from 'prague';

router = first(
    ifMatch(
        m => /Hello|Hi|Wassup/i.test(m.text),
        m => m.reply("Hello, World"
    ),
    simpleRouter(
        m => m.reply("I didn't catch that.")
    )
)
```

>
**Hey**  
*I didn't catch that.*  
**hello**  
*Hello, World*  

Nice!

One of the foundational principles of Prague is "high signal to noise ratio". We want code as concise (and clear!) as possible. So there are a number of shortcuts in the API. One is that `first` (and most other Prague functions), will automatically convert a bare function to a `simpleRouter`:

```typescript
router = first(
    ifMatch(
        m => /Hello|Hi|Wassup/i.test(m.text),
        m => m.reply("Hello, World"
    ),
    m => m.reply("I didn't catch that.")
)
```

Let's take a moment to review how this all works.

1. Our hypothetical Prague bot recipe takes the `text` of each user utterance and packages it into an object along with `reply` method for sending messages back to the user.
2. It then passes that object and the router we defined to the `routeMessage` function.
3. The `first` function attempts to route the message through each router in turn until one succeeds.
4. The `isMatch` function attempts to route the message through the first function. If it succeeds, it routes it to action of second function. The first router succeeds and the second is never called.
5. Otherwise, `first` attempts to route the message through the second router. Since it is a "simple" router with no conditions, it will succeed, routing to its action.

You may be looking at this code wondering how `first` and `ifMatch` are passing the message. Where *is* the message, anyway? The answer is that there is a lot of functional programming magic going on, including higher-order functions (functions returning functions). Suffice to say, underneath Prague's simple and concise exterior lies some fairly sophisticated plumbing. You can learn more in [Inside Prague](Inside.md).

In this lesson we built a simple bot using Prague's message routing pattern. In our [next lesson](MoreRouters.md), we'll add a little more intelligence to our bot.

