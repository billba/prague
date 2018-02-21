# Routing and State

Let's write a simple guessing game.

In order to pull this off, the bot will have to develop some memory. In our example we'll keep it simple by using a JavaScript object, but if your bot talks to multiple users and/or is implemented as a load-balanced web service you'll need to use a different approach.

```typescript
let state: {
    num: number,
    guesses: number
}

router = first(
    ifMatchRE(/start game/, m => {
        m.reply("Guess a number between 1 and 50. You have 10 guesses.");
        state = {
            num: Math.floor(Math.random() * 50),
            guesses: 10
        }
    }),
    ifMatch(m => state.num !== undefined, first(
        ifMatchRE(/\d+/, m => {
            const guess = parseInt(m.groups[0]);
            if (guess === state.num) {
                m.reply("You're right!");
                state.num = undefined;
                return;
            }

            if (guess < state.num )
                m.reply("That is too low.");
            else
                m.reply("That is too high.");

            if (--state.guesses === 0) {
                m.reply("You are out of guesses");
                state.num = undefined;
                return;
            }

            m.reply(`You have ${state.guesses} left.`);
        }),
        m => m.reply("Please guess a number between 1 and 50.")
    )),
    m => m.reply("Type 'start game' to start the game.")
);
```

>
**Hi**
*Type 'start game' to start the game.*
**start game**
*Guess a number between 1 and 50. You have 10 guesses.*
**10**
*That is too low.*
*You have 9 guesses left*
**Hi**
*Please guess a number between 1 and 50.*

There's a lot going on here! Let's take it one step at a time.

As with our previous bot, this router is a `first` of multiple routers. Most Prague apps will take this form.

The first router starts the game by setting `state.num`. This field is subsequently used by the second router's `ifMatch` to test if the game has started. Conditions can reference the message, application state, or anything else. A router might only become active after noon!

This app contains several longish functions. Prague functions are frequently short and sweet, but they can be as long as they need to be!

In the second router, if the user has typed a number then it routes to a long function with several branches. You may wonder why this isn't implemented using routing logic. Routing logic can be efficient and expressive, and it's important for arbitrating between multiple "fuzzy" conditions such as occur with [Natural Language](NaturalLanguage.md). But in this case vanilla JavaScript is the simplest way to solve the problem.

Finally, note that the change in application state changes how the bot responds to unrecognized utterances like "Hi". This interplay of state and routing logic is at the very heart of the art of building Prague applications.

In this lesson, we created a more sophisticated bot whose behavior was driven by changes in application state. In the [next lesson](Dialogs.md) we'll package up this same game code into a reusable component called a `Dialog`.