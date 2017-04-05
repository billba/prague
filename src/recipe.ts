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
import { Message } from 'botframework-directlinejs';
import { BrowserBot } from './BrowserBot';

const browserBot = new BrowserBot()

window["browserBot"] = browserBot.botConnection;

const chat = browserBot.chatConnector;

setTimeout(() => chat.send("Let's get cooking!"), 1000);

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
    all: /(.*)/i
}

interface IntentAction {
    (groups: RegExpExecArray): void; // return false to continue on to next test
}

interface IntentPair {
    intent: RegExp,
    action: IntentAction;  
}

// Either call as test(intent, action) or test([intent, intent, ...], action)
const test = (intents: RegExp | RegExp[], action: IntentAction, name?: string) =>
    (Array.isArray(intents) ? intents : [intents]).map(intent => ({ intent, action }));

// Either call as testMessage(test) or test([test, test, ...])
const testMessage = (message: Message, intentPairs: IntentPair[] | IntentPair[][], defaultAction?: () => void) => {
    const match = [].concat(... (Array.isArray(intentPairs[0]) ? intentPairs : [intentPairs])).some(intentPair => {
        const groups = intentPair.intent.exec(message.text)
        if (groups && groups[0] === message.text) {
            intentPair.action(groups);
            return true;
        }
    });
    if (!match && defaultAction)
        defaultAction();
    return match;
}

import { Store, createStore, combineReducers, applyMiddleware, Action } from 'redux';
import { Epic, combineEpics, createEpicMiddleware } from 'redux-observable';

type PartialRecipe = Partial<Recipe>;

const nullAction = { type: null };

interface RecipeState {
    recipe: PartialRecipe,
    lastInstructionSent: number
}

export interface State {
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
}

const bot = (
    state: RecipeState = {
        recipe: undefined,
        lastInstructionSent: undefined
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
        default:
            return state;
    }
}

const epicSetRecipe: Epic<RecipeAction, State> = (action$, store) =>
    action$.ofType('Set_Recipe')
    .flatMap((action: any) =>
        Observable.from([
            `Great, let's make ${action.recipe.name} which ${action.recipe.recipeYield.toLowerCase()}!`,
            "Here are the ingredients:",
            ... action.recipe.recipeIngredient,
            "Let me know when you're ready to go."
        ])
        .zip(Observable.timer(0, 2000), x => x)
    )
    .do(ingredient => chat.send(ingredient))
    .count()
    .mapTo(nullAction);

const store = createStore(
    combineReducers<State>({
        bot
    }),
    applyMiddleware(createEpicMiddleware(combineEpics(
        epicSetRecipe
    )))
);

const globalDefaultAction = () => chat.send("I can't understand you. It's you, not me. Get it together and try again.");

const recipeFromName = (name: string) =>
    recipes.find(recipe => recipe.name.toLowerCase() === name.toLowerCase());

const chooseRecipe: IntentAction = groups => {
    const name = groups[1];
    const recipe = recipeFromName(name);
    if (recipe)
        store.dispatch<RecipeAction>({ type: 'Set_Recipe', recipe });
    else
        chat.send(`Sorry, I don't know how to make ${name}. Maybe one day you can teach me.`);
}

const queryQuantity: IntentAction = groups => {
    const ingredientQuery = groups[1].split('');

    const ingredient = store.getState().bot.recipe.recipeIngredient
        .map<[string, number]>(i => [i, lcs(i.split(''), ingredientQuery).length])
        .reduce((prev, curr) => prev[1] > curr[1] ? prev : curr)
        [0];

    chat.send(ingredient);
}

const sayInstruction = (instruction: number) => {
    store.dispatch({ type: 'Set_Instruction', instruction });
    const state = store.getState().bot;
    chat.send(state.recipe.recipeInstructions[state.lastInstructionSent]);
    if (state.recipe.recipeInstructions.length === state.lastInstructionSent + 1)
        chat.send("That's it!");
}

const mustChooseRecipe = () => chat.send("First please choose a recipe");

chat.activity$
.filter(activity => activity.type === 'message')
.subscribe((message: Message) => {
    const state = store.getState().bot;

    // First priority is to choose a recipe
    if (!state.recipe) {
        testMessage(message, [
            test(intents.chooseRecipe, chooseRecipe),
            test([
                intents.queryQuantity,
                intents.instructions.start,
                intents.instructions.restart
            ], mustChooseRecipe),
            test(intents.all, chooseRecipe)
        ], globalDefaultAction);
        return;
    }
    
    // These can happen any time there is an active recipe
    if (testMessage(message, [
            test(intents.queryQuantity, queryQuantity),
            // TODO: conversions go here
    ])) {
        return;
    }

    // Start instructions
    if (state.lastInstructionSent === undefined) {
        if (testMessage(message, test(intents.instructions.start, () => sayInstruction(0))))
            return;
    }

    // Navigate instructions
    testMessage(message, [
        test(intents.instructions.next, () => {
            const nextInstruction = state.lastInstructionSent + 1;
            if (nextInstruction < state.recipe.recipeInstructions.length)
                sayInstruction(nextInstruction);
            else
                chat.send("That's it!");
        }),
        test(intents.instructions.repeat, () => sayInstruction(state.lastInstructionSent)),
        test(intents.instructions.previous, () => {
            const prevInstruction = state.lastInstructionSent - 1;

            if (prevInstruction >= 0)
                sayInstruction(prevInstruction);
            else
                chat.send("We're at the beginning.");
        }),
        test(intents.instructions.restart, () => sayInstruction(0))
    ], globalDefaultAction);
});
