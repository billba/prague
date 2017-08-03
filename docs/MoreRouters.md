## More on Routing

Let's add a new pattern to respond if the user introduces themselves. We'll use another shortcut function called `matchRE`, for testing regular expressions. 

```typescript
import { matchRE } from 'prague';

router = first(
    ifMatch(matchRE(/I am (.*)/i), m => m.reply(`Nice to meet you`)),
    ifMatch(matchRE(/Hello|Hi|Wassup/i), m => m.reply("Hello, World")),
    m => m.reply("I didn't catch that.")
)
```

>
**Hello**  
*Hello, World*  
**I am Bill**  
*Nice to meet you*

Again, `first` tries routing each message through each of its routers until one succeeds.

It would be nice to greet the user by name. It turns out that the conditions in `ifMatch` don't have to be boolean expressions. They can alternatively return a modified version of the original message, adding new elements. In this case, `matchRE`, if successful, adds the matching groups to a field called `groups`:

```typescript
import { matchRE } from 'prague';

router = first(
    ifMatch(matchRE(/I am (.*)/i), m => m.reply(`Nice to meet you, ${m.groups[1]}.`)),
    ifMatch(matchRE(/Hello|Hi|Wassup/i), m => m.reply("Hello, World")),
    m => m.reply("I didn't catch that.")
)
```

>
**I am Bill**  
*Nice to meet you, Bill.*

Now let's imagine that there is a select group of VIP users who should get a special response. We can do this by defining a special router just for them:

```typescript
router = first(
    ifMatch(matchRE(/I am (.*)/i), m => m.groups[1] === 'Bill', m => m.reply(`You are very handsome, ${m.groups[1]}.`)),
    ifMatch(matchRE(/I am (.*)/i), m => m.reply(`Nice to meet you, ${m.groups[1]}.`)),
    ifMatch(matchRE(/Hello|Hi|Wassup/i), m => m.reply("Hello, World")),
    m => m.reply("I didn't catch that.")
)
```

>
**I am Bill**  
*You are very handsome, Bill.*  
**I am Hannah**  
*Nice to meet you, Hannah.*  

As you can see, `ifMatch` can take multiple conditions. Each condition much be satisfied for the route to succeed.

This works, but we are calling `matchRE` twice with the same string, which isn't very efficient. Imagine if this condition instead involved making a REST call to an external API. This would be expensive in terms of time and possibly even monetarily. We can combine the two by composing another instance of `first` under `ifMatch`:

```typescript
router = first(
    ifMatch(
        matchRE(/I am (.*)/i),
        first(
            ifMatch(m => m.groups[1] === 'Bill', m => m.reply(`You are very handsome, ${m.groups[1]}.`)),
            m => m.reply(`Nice to meet you, ${m.groups[1]}.`)
        )
    ),
    ifMatch(matchRE(/Hello|Hi|Wassup/i), m => m.reply("Hello, World")),
    m => m.reply("I didn't catch that.")
)
```

>
**I am Bill**  
*You are very handsome, Bill.*  
**I am Hannah**  
*Nice to meet you, Hannah.*  

Same behavior, but more efficient code. The top-level `first` contains three routers. The first has an initial condition that tests a regular expression. If it succeeds, the message is passed to the second instance of `first`, which tests *its* children. If the user is a VIP, it responds one way. Otherwise it responds another.

In this code the non-VIP case will always succeed. But what if also had a condition?

```typescript
router = first(
    ifMatch(
        matchRE(/I am (.*)/i),
        first(
            ifMatch(m => m.groups[1] === 'Bill', m => m.reply(`You are very handsome, ${m.groups[1]}.`)),
            ifMatch(m => m.groups[1] === 'Ryan', m => m.reply(`Nice to meet you, ${m.groups[1]}.`)
        )
    ),
    ifMatch(matchRE(/Hello|Hi|Wassup/i), m => m.reply("Hello, World")),
    m => m.reply("I didn't catch that.")
)
```

>
**I am Bill**  
*You are very handsome, Bill.*  
**I am Hannah**  
*I didn't catch that.*  

This demonstrates how small changes in routing logic can result in very different behavior. Prague message routing is powerful, and with great power comes great responsibility.

By the way, matching on regular expressions in this way is so common that there is another shortcut, a purpose-built version of `ifMatch`:

```typescript
import { ifMatchRE } from 'prague';

router = first(
    ifMatchRE(/I am (.*)/i, first(
        ifMatch(m => m.groups[1] === 'Bill', m => m.reply(`You are very handsome, ${m.groups[1]}.`)),
        m => m.reply(`Nice to meet you, ${m.groups[1]}.`)
    )),
    ifMatchRE(/Hello|Hi|Wassup/i, m => m.reply("Hello, World")),
    m => m.reply("I didn't catch that.")
)
```

Less noise, more signal!

In this lesson we added a little more functionality to our bot, learning about a couple of Regular Expression helpers, multiple `ifMatch` conditions, and composability of routers. In our [next lesson](State.md), we'll experiment with state.

