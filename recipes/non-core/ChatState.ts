export interface ChatState<BOT = undefined, USERINCHANNEL = undefined, CHANNEL = undefined, CONVERSATION = undefined, USERINCONVERSATION = undefined> {
    bot?: BOT
    userInChannel?: USERINCHANNEL,
    channel?: CHANNEL,
    conversation?: CONVERSATION,
    userInConversation?: USERINCONVERSATION
}
