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
        repeat: /(what's that again|huh|say that again|please repeat that|repeat that|)/i,
        restart: /(start over|start again|restart)/i
    },
    chooseRecipe: /I want to make (?:|a|some)*\s*(.+)/i,
    queryQuantity: /how (?:many|much) (.+)/i
}

interface IntentAction {
    (groups: RegExpExecArray): void; // return false to continue on to next test
}

interface IntentPair {
    intent: RegExp,
    action: IntentAction;  
}

const Test = (intent: RegExp, action: IntentAction, name?: string) => ({ intent, action });

const testMessage = (message: Message, intentPairs: IntentPair[], defaultAction?: () => void) => {
    const match = intentPairs.some(intentPair => {
        const groups = intentPair.intent.exec(message.text);
        if (groups && groups[0] === message.text) {
            intentPair.action(groups);
            return true;
        }
    });
    if (!match && defaultAction)
        defaultAction();
    return match;
}

interface State {
    recipe: Partial<Recipe>,
    lastInstructionSent: number
}

const state: Partial<State> = {};

const globalDefaultAction = () => chat.send("I can't understand you. It's you, not me. Get it together and try again.");

const recipeFromName = (name: string) =>
    recipes.find(recipe => recipe.name.toLowerCase() === name.toLowerCase());

const chooseRecipe = (groups: RegExpExecArray) => {
    const name = groups[1];
    const recipe = recipeFromName(name);
    if (recipe) {
        state.recipe = recipe;
        delete state.lastInstructionSent; // clear this out in case we're starting over
        chat.send(`Great, let's make ${name} which ${recipe.recipeYield}!`);
        recipe.recipeIngredient.forEach(ingredient => {
            chat.send(ingredient);
        })
        chat.send("Let me know when you're ready to go.");
    } else {
        chat.send(`Sorry, I don't know how to make ${name}. Maybe one day you can teach me.`);
    }
}

const queryQuantity = (groups: RegExpExecArray) => {
    const ingredientQuery = groups[1].split('');

    const ingredient = state.recipe.recipeIngredient
        .map<[string, number]>(i => [i, lcs(i.split(''), ingredientQuery).length])
        .reduce((prev, curr) => prev[1] > curr[1] ? prev : curr)
        [0];

    chat.send(ingredient);
}

const sayInstruction = (i: number) => {
    state.lastInstructionSent = i;
    chat.send(state.recipe.recipeInstructions[i]);
    if (state.recipe.recipeInstructions.length === i + 1)
        chat.send("That's it!");
}

const mustChooseRecipe = () => chat.send("First please choose a recipe");

chat.activity$
.filter(activity => activity.type === 'message')
.subscribe((message: Message) => {
    // First priority is to choose a recipe
    if (!state.recipe) {
        testMessage(message, [
            Test(intents.chooseRecipe, chooseRecipe),
            Test(intents.queryQuantity, mustChooseRecipe),
            Test(intents.instructions.start, mustChooseRecipe),
            Test(intents.instructions.restart, mustChooseRecipe)
        ], globalDefaultAction);
        return;
    }
    
    // These can happen any time there is an active recipe
    if (testMessage(message, [
            Test(intents.queryQuantity, queryQuantity),
            // TODO: conversions
    ])) {
        return;
    }

    // Start instructions
    if (state.lastInstructionSent === undefined) {
        if (testMessage(message, [
            Test(intents.instructions.start, () => sayInstruction(0))
        ])) {
            return;
        }
    }

    // Navigate instructions
    testMessage(message, [
        Test(intents.instructions.next, () => {
            const nextInstruction = state.lastInstructionSent + 1;
            if (nextInstruction < state.recipe.recipeInstructions.length)
                sayInstruction(nextInstruction);
            else
                chat.send("That's it!");
        }),
        Test(intents.instructions.repeat, () => sayInstruction(state.lastInstructionSent)),
        Test(intents.instructions.previous, () => {
            const prevInstruction = state.lastInstructionSent - 1;

            if (prevInstruction >= 0)
                sayInstruction(prevInstruction);
            else
                chat.send("We're at the beginning.");
        }),
        Test(intents.instructions.restart, () => sayInstruction(0))
    ], globalDefaultAction);
});
