# Dialogs

Let's imagine that we'd like to make the guessing game from the [previous chapter](State.md) available to other bots. If this were a standard JavaScript application we might do this by creating a class. A constructor would create a new instance, each of which would have its own storage, and there would be a public method for handling guesses. **A Dialog is like a class for message routing.**

First we'll create the constructor and its types :

```typescript
import { DialogConstructor } from 'prague';

interface GameState {
    num: number,
    guesses: number
}

interface GameArgs {
    upperLimit: number;
    numGuesses: number;
}

gameConstructor: DialogConstructor<M, GameArgs, {}, GameState> = 
    (dialog, m) => {
        m.reply(`Guess a number between 1 and ${dialog.args.upperLimit}. You have ${dialog.args.numGuesses} guesses.`);
        dialog.state = {
            num: Math.floor(Math.random() * (dialog.args.upperLimit || 50)),
            guesses: (dialog.args.numGuesses || 10)
        }
```

The main change from our original code is we no longer look for a starting message. That's the responsibility of the calling router. We also now take arguments for the constructor (the code itself embeds default values for those arguments).

Now let's create the router:

```typescript
import { DialogRouter } from 'prague';

gameRouter: DialogRouter<M, {}, GameState> = (dialog) => first(
    ifMatchRE(/\d+/, m => {
        const guess = parseInt(m.groups[0]);
        if (guess === dialog.state.num) {
            m.reply("You're right!");
            return dialog.end();
        }

        if (guess < dialog.state.num )
            m.reply("That is too low.");
        else
            m.reply("That is too high.");

        if (--dialog.state.guesses === 0) {
            m.reply("You are out of guesses");
            return dialog.end();
        }
        
        m.reply(`You have ${dialog.state.guesses} left.`);
    }),
    m => m.reply("Please guess a number between 1 and 50.")
)
```

We're no longer overloading the game state with the need to track whether the game is in progress. Instead we end the game by calling `dialog.end()`. 

Next we register these functions as a dialog:

```typescript
import { Dialogs } from 'prague';

const dialogs = new Dialogs<M>();

dialogs.add('game', {
    constructor: gameConstructor,
    router: gameRouter
});
```

Now we need to add logic to start the game and keep it going. We do this with a second dialog, which we'll mysteriously (for now) call 'root':

```typescript
let rootRouter: DialogRouter<M>;

rootRouter = (dialog) => first(
    dialog.routeTo(gameDialog, matchRE(/start game/i)),
    m => m.reply("Type 'start game' to start the game")
);

dialogs.add('root', {
    router: rootRouter
});
```

This dialog doesn't set any initial state so it doesn't require a constructor.

If you squint you can see most of the rest of our original game logic:

1. Initiate the game when the user types 'start game'
2. Catch-all to help users

`dialog.routeTo` checks to see if the named dialog is currently activated. If not, it checks the supplied condition. If that succeeds, the dialog is activated (calling its constructor). On the dialog was already activated, it routes the message to that dialog's router. If that dialog's router calls `dialog.end()` then it is deactivated, returning everything to its original state.

Finally we route to this dialog from our application router:

```typescript
router = dialogs.routeToRoot('root');
```

Why do we need the root dialog? Prague routers don't know anything about dialogs or the activation or routing thereof. Calling `dialogs.routeToRoot` bootstraps this context for a single dialog and the dialogs it calls.

You don't have to use dialogs in your Prague application, but if you do you will probably follow this pattern of placing your application routing logic in your root dialog and the dialogs it calls, with the application router doing nothing but routing to the root dialog.

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

It may seem we did a lot of work to recreate the same user experience we had before. But now that the game is encapsulated as a dialog, we can call it with any router. That router won't need to know anything about that dialog except its types. And the game dialog won't know anything about the router calling it. This sort of thing makes developers happy because it makes it easy to change the implementation of the dialog without having to change the router, and vice-versa.

Dialogs are a powerful pattern and most complex Prague applications will make heavy use of them. Perhaps you'll come up a different pattern for making sense of large applications - if so, please share them with the Prague community!

In this chapter we converted our game bot into a bot calling a game dialog via a root dialog. In the [next chapter](MoreDialogs.md) we will dig further into dialogs.
