export interface BotData<BOT, USER, CHANNEL, CONVERSATION, USERINCONVERSATION> {
    bot?: BOT
    user?: USER,
    channel?: CHANNEL,
    conversation?: CONVERSATION,
    userInConversation?: USERINCONVERSATION
}

export interface IStateSession<BOTDATA> {
    data: BOTDATA;
}
