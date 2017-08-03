# Prompting the user

So far our bot has strictly replied to user utterances. Let's build a bot that asks questions too. Something like:

>
**stock quote**
*What stock do you want to look up?*
**MSFT**
*MSFT is trading at one million dollars per share.*

Here's a question about questions: how can your router distinguish a user utterance (e.g. "stock quote") from an answer to a question (e.g. "MSFT")? The answer is: by remembering that we asked a question.

```typescript

router = first(
    m => m.reply("I didn't catch that.")
)
```