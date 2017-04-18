export interface ChatState<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION> {
    bot?: BOT
    user?: USER,
    channel?: CHANNEL,
    conversation?: CONVERSATION,
    userInConversation?: USERINCONVERSATION
}
