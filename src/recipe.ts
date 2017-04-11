import lcs = require('longest-common-substring');
import { convertIngredient } from "./weightsAndMeasures";
import { recipesRaw } from './recipes';
const recipes = recipesRaw as Partial<Recipe>[];

//convertIngredient("1oz cheese", "metric");
//convertIngredient("1lb cheese", "metric");
//convertIngredient("10g cheese", "imperial");
convertIngredient("10floz milk", "metric");

interface Recipe {
    name: string,
    description: string,
    cookTime: string,
    cookingMethod: string;
    nutrition: NutritionInformation,
    prepTime: string,
    recipeCategory: string,
    recipeCuisine: string,
    recipeIngredient: string[],
    recipeInstructions: string[],
    recipeYield: string,
    suitableForDiet: string,
    totalTime: string
}

interface NutritionInformation {
    calories: number,
    carbohydrateContent: number,
    cholesterolContent: number,
    fatContent: number,
    fiberContent: number,
    proteinContent: number,
    saturatedFatContent: number,
    servingSize: string,
    sodiumContent: number,
    sugarContent: number,
    transFatContent: number,
    unsaturatedFatContent: number
}

import { Observable } from 'rxjs';
import { Message, CardAction } from 'botframework-directlinejs';
import { UniversalChat } from './Chat';
import { WebChatConnector } from './Connectors/WebChat';
import { runMessage, Handler as _Handler, Context, defaultRule, context, always, rule, Queries } from './Intent';
import { RE } from './RegExp';

type Handler = _Handler<AppState>;

const webChat = new WebChatConnector()
window["browserBot"] = webChat.botConnection;
const chat = new UniversalChat(webChat.chatConnector);

const reply = (text: string): Handler => (message) => chat.reply(message, text);

// setTimeout(() => chat.send("Let's get cooking!"), 1000);

import { Store, createStore, combineReducers, applyMiddleware, Action } from 'redux';
import { Epic, combineEpics, createEpicMiddleware } from 'redux-observable';

type PartialRecipe = Partial<Recipe>;

const nullAction = { type: null };

interface RecipeState {
    recipe: PartialRecipe,
    lastInstructionSent: number,
    promptKey: string
}

export interface AppState {
    bot: RecipeState
}

type RecipeAction = {
    type: 'Set_Recipe',
    recipe: PartialRecipe
} | {
    type: 'Recipe_Not_Found'
} | {
    type: 'Set_Instruction',
    instruction: number
} | {
    type: 'Set_PromptKey',
    promptKey: string
}

const bot = (
    state: RecipeState = {
        recipe: undefined,
        lastInstructionSent: undefined,
        promptKey: undefined
    },
    action: RecipeAction
) => {
    switch (action.type) {
        case 'Set_Recipe': {
            return {
                ... state,
                recipe: action.recipe,
                lastInstructionSent: undefined
            }
        }
        case 'Set_Instruction': {
            return {
                ... state,
                lastInstructionSent: action.instruction
            }
        }
        case 'Set_PromptKey': {
            return {
                ... state,
                promptKey: action.promptKey
            }
        }
        default:
            return state;
    }
}

const store = createStore(
    combineReducers<AppState>({
        bot
    }),
    applyMiddleware(createEpicMiddleware(combineEpics(
        // Epics go here
    )))
);

// Prompts

import { ChoiceLists, PromptRulesMaker, Prompt } from './Prompt';

const recipeChoiceLists: ChoiceLists = {
    'Cheeses': ['Cheddar', 'Wensleydale', 'Brie', 'Velveeta']
}

const recipePromptRules: PromptRulesMaker<AppState> = prompt => ({
    'Favorite_Color': prompt.text((message, args) =>
        chat.reply(message, args['text'] === "blue" ? "That is correct!" : "That is incorrect"),
    ),
    'Favorite_Cheese': prompt.choice('Cheeses', (message, args) =>
        chat.reply(message, args['choice'] === "Velveeta" ? "Ima let you finish but FYI that is not really cheese." : "Interesting.")
    ),
    'Like_Cheese': prompt.confirm((message, args) => {
        console.log("here");
        chat.reply(message, args['confirm'] ? "That is correct." : "That is incorrect.")
    }),
});

const getPromptKey = () => store.getState().bot.promptKey;
const setPromptKey = (promptKey: string) => store.dispatch({ type: 'Set_PromptKey', promptKey });
const prompt = new Prompt<AppState>(chat, store, recipeChoiceLists, recipePromptRules, getPromptKey, setPromptKey);

// Intents

// Message handlers

const chooseRecipe: Handler = (message, args, store) => {
    const name = args['groups'][1];
    const recipe = recipeFromName(name);
    if (recipe) {
        store.dispatch<RecipeAction>({ type: 'Set_Recipe', recipe });

        return Observable.from([
            `Great, let's make ${name} which ${recipe.recipeYield.toLowerCase()}!`,
            "Here are the ingredients:",
            ... recipe.recipeIngredient,
            "Let me know when you're ready to go."
        ])
        // .zip(Observable.timer(0, 1000), x => x) // Right now we're having trouble introducing delays
        .do(ingredient => chat.reply(message, ingredient))
        .count();
    } else {
        return chat.reply(message, `Sorry, I don't know how to make ${name}. Maybe one day you can teach me.`);
    }
}

const queryQuantity: Handler = (message, args, store) => {
    const ingredientQuery = args['groups'][1].split('');

    const ingredient = store.getState().bot.recipe.recipeIngredient
        .map<[string, number]>(i => [i, lcs(i.split(''), ingredientQuery).length])
        .reduce((prev, curr) => prev[1] > curr[1] ? prev : curr)
        [0];

    chat.reply(message, ingredient);
}

const nextInstruction: Handler = (message, args, store) => {
    const bot = store.getState().bot;
    const nextInstruction = bot.lastInstructionSent + 1;
    if (nextInstruction < bot.recipe.recipeInstructions.length)
        sayInstruction(message, { instruction: nextInstruction }, store);
    else
        chat.reply(message, "That's it!");
}

const previousInstruction: Handler = (message, args, store) => {
    const prevInstruction = store.getState().bot.lastInstructionSent - 1;
    if (prevInstruction >= 0)
        sayInstruction(message, { instruction: prevInstruction }, store);
    else
        chat.reply(message, "We're at the beginning.");
}

const sayInstruction: Handler = (message: Message, args: { instruction: number }, store) => {
    store.dispatch({ type: 'Set_Instruction', instruction: args.instruction });
    const bot = store.getState().bot;
    chat.reply(message, bot.recipe.recipeInstructions[bot.lastInstructionSent]);
    if (bot.recipe.recipeInstructions.length === bot.lastInstructionSent + 1)
        chat.reply(message, "That's it!");
}

const globalDefaultRule = defaultRule<AppState>(reply("I can't understand you. It's you, not me. Get it together and try again."));

const recipeFromName = (name: string) =>
    recipes.find(recipe => recipe.name.toLowerCase() === name.toLowerCase());

const queries: Queries<AppState> = {
    always: always,
    noRecipe: state => !state.bot.recipe,
    noInstructionsSent: state => state.bot.lastInstructionSent === undefined,
}

// RegExp

const intents = {
    instructions: {
        start: /(Let's start|Start|Let's Go|Go|I'm ready|Ready|OK|Okay)\.*/i,
        next: /(Next|What's next|next up|OK|okay|Go|Continue)/i,
        previous: /(go back|back up|previous)/i,
        repeat: /(what's that again|huh|say that again|please repeat that|repeat that|repeat)/i,
        restart: /(start over|start again|restart)/i
    },
    chooseRecipe: /I want to make (?:|a|some)*\s*(.+)/i,
    queryQuantity: /how (?:many|much) (.+)/i,
    askQuestion: /ask/i,
    askYorNQuestion: /yorn/i,
    askChoiceQuestion: /choice/i,
    all: /(.*)/i
}

const re = new RE<AppState>();

// LUIS

import { LUIS } from './LUIS';

const luis = new LUIS<AppState>({
    name: 'testModel',
    id: 'id',
    key: 'key'
});

const contexts: Context<AppState>[] = [

    // Prompts
    prompt.context(),

    // For testing Prompts
    context(queries.always,
        re.rule(intents.askQuestion, (message) => prompt.textCreate(message, 'Favorite_Color', "What is your favorite color?")),
        re.rule(intents.askYorNQuestion, (message) => prompt.confirmCreate(message, 'Like_Cheese', "Do you like cheese?")),
        re.rule(intents.askChoiceQuestion, (message) => prompt.choiceCreate(message, 'Favorite_Cheese', 'Cheeses', "What is your favorite cheese?"))
    ),

    // For testing LUIS

    context(queries.always,
        luis.rule('testModel', [
            luis.intent('singASong', (message, args) => chat.reply(message, `Let's sing ${args.song}`)),
            luis.intent('findSomething', (message, args) => chat.reply(message, `Okay let's find a ${args.what} in ${args.where}`))
        ])
    ),

    // If there is no recipe, we have to pick one
    context(queries.noRecipe,
        re.rule(intents.chooseRecipe, chooseRecipe),
        re.rule([intents.queryQuantity, intents.instructions.start, intents.instructions.restart], reply("First please choose a recipe")),
        re.rule(intents.all, chooseRecipe)
    ),

    // Now that we have a recipe, these can happen at any time
    context(queries.always,
        re.rule(intents.queryQuantity, queryQuantity), /* TODO: conversions go here */
    ),

    // If we haven't started listing instructions, wait for the user to tell us to start
    context(queries.noInstructionsSent,
        re.rule([intents.instructions.start, intents.instructions.next], (message, args, store) => sayInstruction(message, { instruction: 0 }, store))
    ),

    // We are listing instructions. Let the user navigate among them.
    context(queries.always,
        re.rule(intents.instructions.next, nextInstruction),
        re.rule(intents.instructions.repeat, (message, args, store) => sayInstruction(message, { instruction: store.getState().bot.lastInstructionSent }, store)),
        re.rule(intents.instructions.previous, previousInstruction),
        re.rule(intents.instructions.restart, (message, args, store) => sayInstruction(message, { instruction: 0 }, store)),
        globalDefaultRule
    )
];

chat.activity$
.filter(activity => activity.type === 'message')
.do(message => console.log("message", message))
.switchMap((message: Message) => runMessage(store, contexts, message))
.subscribe();
