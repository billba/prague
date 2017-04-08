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
import { ChatConnector } from './Chat';
import { IntentEngine, Handler as _Handler, Context, defaultRule, context, always, rule, Queries } from './Intent';
import { re as _re } from './RegExp';
import { BrowserBot } from './BrowserBot';

type Handler = _Handler<AppState>;
const re = (intents: RegExp | RegExp[], handler: Handler) => _re(intents, handler); // TODO: there's got to be a better way

const browserBot = new BrowserBot()

window["browserBot"] = browserBot.botConnection;

const chat = browserBot.chatConnector;

setTimeout(() => chat.send("Let's get cooking!"), 1000);

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

const epicSetRecipe: Epic<RecipeAction, AppState> = (action$, store) =>
    action$.ofType('Set_Recipe')
    .flatMap((action: any) =>
        Observable.from([
            `Great, let's make ${action.recipe.name} which ${action.recipe.recipeYield.toLowerCase()}!`,
            "Here are the ingredients:",
            ... action.recipe.recipeIngredient,
            "Let me know when you're ready to go."
        ])
        .zip(Observable.timer(0, 1000), x => x)
    )
    .do(ingredient => chat.send(ingredient))
    .count()
    .mapTo(nullAction);

const store = createStore(
    combineReducers<AppState>({
        bot
    }),
    applyMiddleware(createEpicMiddleware(combineEpics(
        epicSetRecipe
    )))
);

// Prompts

import { ChoiceLists, PromptRulesMaker, Prompt } from './Prompt';

const recipeChoiceLists: ChoiceLists = {
    'Cheeses': ['Cheddar', 'Wensleydale', 'Brie', 'Velveeta']
}

const recipePromptRules: PromptRulesMaker<AppState> = prompt => ({
    'Favorite_Color': rule(prompt.textRecognizer(),
        (store, message, entities) => {
            if (entities['text'] === 'blue')
                chat.send("That is correct!");
            else
                chat.send("That is incorrect");
        }
    ),
    'Favorite_Cheese': rule(prompt.choiceRecognizer('Cheeses'),
        (store, message, entities) => {
            if (entities['choice'] === 'Velveeta')
                chat.send('Ima let you finish but FYI that is not really cheese.');
            else
                chat.send("Interesting.");
        }
    ),
    'Like_Cheese': rule(prompt.confirmRecognizer(),
        (store, message, entities) => {
            if (entities['confirm'])
                chat.send('That is correct.');
            else
                chat.send("That is incorrect.");
        }
    )
});

const prompt = new Prompt(chat, store, recipeChoiceLists, recipePromptRules);

// Intents

// Message handlers

const chooseRecipe: Handler = (store, message, entities) => {
    const name = entities['groups'][1];
    const recipe = recipeFromName(name);
    if (recipe)
        store.dispatch<RecipeAction>({ type: 'Set_Recipe', recipe });
    else
        chat.send(`Sorry, I don't know how to make ${name}. Maybe one day you can teach me.`);
}

const queryQuantity: Handler = (store, message, entities) => {
    const ingredientQuery = entities['groups'][1].split('');

    const ingredient = store.getState().bot.recipe.recipeIngredient
        .map<[string, number]>(i => [i, lcs(i.split(''), ingredientQuery).length])
        .reduce((prev, curr) => prev[1] > curr[1] ? prev : curr)
        [0];

    chat.send(ingredient);
}

const nextInstruction: Handler = (store) => {
    const state = store.getState();
    const nextInstruction = state.bot.lastInstructionSent + 1;
    if (nextInstruction < state.bot.recipe.recipeInstructions.length)
        sayInstruction(store, nextInstruction);
    else
        chat.send("That's it!");
}

const previousInstruction: Handler = (store) => {
    const prevInstruction = store.getState().bot.lastInstructionSent - 1;
    if (prevInstruction >= 0)
        sayInstruction(store, prevInstruction);
    else
        chat.send("We're at the beginning.");
}

const sayInstruction = (store, instruction: number) => {
    store.dispatch({ type: 'Set_Instruction', instruction });
    const state = store.getState().bot;
    chat.send(state.recipe.recipeInstructions[state.lastInstructionSent]);
    if (state.recipe.recipeInstructions.length === state.lastInstructionSent + 1)
        chat.send("That's it!");
}

const globalDefaultRule = defaultRule<AppState>(() => chat.send("I can't understand you. It's you, not me. Get it together and try again."));

const recipeFromName = (name: string) =>
    recipes.find(recipe => recipe.name.toLowerCase() === name.toLowerCase());

const queries: Queries<AppState> = {
    always: always,
    noRecipe: state => !state.bot.recipe,
    noInstructionsSent: state => state.bot.lastInstructionSent === undefined,
}

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

const contexts: Context<AppState>[] = [

    // Prompts
    prompt.context(),

    // For testing Prompts
    context(queries.always,
        re(intents.askQuestion, _ => prompt.text('Favorite_Color', "What is your favorite color?")),
        re(intents.askYorNQuestion, _ => prompt.confirm('Like_Cheese', "Do you like cheese?")),
        re(intents.askChoiceQuestion, _ => prompt.choice('Favorite_Cheese', 'Cheeses', "What is your favorite cheese?"))
    ),

    // If there is no recipe, we have to pick one
    context(queries.noRecipe,
        re(intents.chooseRecipe, chooseRecipe),
        re([intents.queryQuantity, intents.instructions.start, intents.instructions.restart], _ => chat.send("First please choose a recipe")),
        re(intents.all, chooseRecipe)
    ),

    // Now that we have a recipe, these can happen at any time
    context(queries.always,
        re(intents.queryQuantity, queryQuantity), /* TODO: conversions go here */
    ),

    // If we haven't started listing instructions, wait for the user to tell us to start
    context(queries.noInstructionsSent,
        re([intents.instructions.start, intents.instructions.next], store => sayInstruction(store, 0))
    ),

    // We are listing instructions. Let the user navigate among them.
    context(queries.always,
        re(intents.instructions.next, nextInstruction),
        re(intents.instructions.repeat, store => sayInstruction(store, store.getState().bot.lastInstructionSent)),
        re(intents.instructions.previous, previousInstruction),
        re(intents.instructions.restart, store => sayInstruction(store, 0)),
        globalDefaultRule
    )
];

const intentEngine = new IntentEngine(store, contexts);

chat.activity$
.filter(activity => activity.type === 'message')
.do(message => console.log("message", message))
.flatMap((message: Message) => intentEngine.runMessage(message))
.subscribe();
