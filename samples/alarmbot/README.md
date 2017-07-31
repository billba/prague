# alarmbot

A sample [Prague](http://github.com/billba/prague) browser-based bot featuring the classic alarmbot. A good comparison with BotBuilder v3

Note: this sample does not actually set any alarms :-)

# How to use

1. clone the entire Prague, if you haven't already
2. go to the `samples/alarmBot` directory
3. `npm install`
4. `npm run build` (or `npm run watch` to build on changes)
5. in a different terminal window, `npm run start`
6. aim your browser at `http://localhost:8000`

# design notes

## Alarms

Alarms are stored in an instance of the Alarms class. If this were a multi-instance/multi-user bot, a different architecture would be required, with centralized data available to each instance, and stored on a per-user basis. This sample doesn't actually sounds any alarms, but if it did that functionality too would have to be oursourced to an external service which send events to this bot.

## The BrowserBot recipe

The `BrowserBot` instance `browserBot` subscribes to the instance of WebChat. Every time WebChat emits an activity, it is put into an `IChatActivityMatch` object and added to `browserBot.message$` (read "message stream"), which acts as a queue.

(Anyone can add messages to this same queue, a technique used in two other places in this bot.)

A separate message pump subscribes to the `browserBot.message$` queue and routes them to `activityRouter`. This router gets all types of activities - events, messages, typing, etc. It routes to type-specific routers using the `routeChatActivity` router.

When the app is fully configured, we kicks off the bot by calling `botBrowser.start()`, which places an `event` activity named `start` in the `browserBot.message$` queue. `activityRouter` routes this message to `dialogs.setRoot()`, which creates an instance of `alarmDialog` (calling its constructor, which welcomes the user) and sets it as the root dialog. Subsequent `message` events are then routed to `dialogs.routeToRoot()` which then routes them to the router of that instance of `alarmDialog`'s.

If you wanted to incorporate the functionality of `alarmDialog` into a larger bot, you would likely create a different root dialog which itself created the `alarmDialog` instance and routed messages to it as it saw fit.

## Dialogs

All the alarm logic is contained in `alarmDialog` and its child dialogs, `setAlarmDialog`, `deleteAlarmDialog`, and `listAlarmDialog`. `alarmDialog` acts as a dispatcher, triggering the child dialogs on regular expressions.

Technically `listAlarmDialog` doesn't need to be a dialog, as it just executes code and then ends, and therefore would never be routed subsequent messages. However a future version might add routing functionality, e.g. "delete the third alarm", so it is implemented as a dialog with no router.

`setAlarmDialog` and `deleteAlarmDialog` each have title validation functions which help with some code duplication.

There are two slightly different implementations of the router logic of `setAlarmDialog` and `deleteAlarmDialog`. Each takes a different approach of solving the problem of "what do we do next after the user responds.":

### "reroute" (default)

This implementation uses `reroute` and Prague's built-in prompts to enable a state-driven approach. The idea is that, after completing each action (e.g. "get title"), the system reverts to a rest state. The last message is rerouted through the entire app router. If it is correctly designed (and here it is) that message will route back into the dialog's router, which will look at the state to determine the next action.

This is an experimental pattern, following the React pattern. In React, handling events is split into two phases:
1. user actions -> update app state
2. state updates -> app behavior

Decoupling the two allows much more freedom on each side. Importantly, it allows state to be modified externally. For example, imagine if there were an iOS app for managing the same alarms. The bot and the app would need to be driven by a common state store, not by user actions, so that each UI could stay in sync with each other and respond accordingly to the user.

### "waterfall"

This implementation behaves exactly the same, but it uses deterministic code to determine what to do after the user responds. To try it out, rename `bot.ts` to `bot.reroute.ts`, then rename `bot.waterfall.ts` to `bot.ts`.

This is a traditional pattern. There is more code because the intelligence of the system is in the code and not in the state. After a title is entered, we always look for the time. "Next action" is conditioned on the last user action, not on the current state. Changing that order of entering variables would require changing a lot of code, whereas in the 'reroute' option it is just swapping the order of the state comparisons in `setAlarmDialog`.
