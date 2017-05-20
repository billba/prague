export interface ChatState<BOT = undefined, USER = undefined, CHANNEL = undefined, CONVERSATION = undefined, USERINCONVERSATION = undefined> {
    bot?: BOT
    user?: USER,
    channel?: CHANNEL,
    conversation?: CONVERSATION,
    userInConversation?: USERINCONVERSATION
}
