import lcs = require('longest-common-substring');
import { convertIngredient } from "./weightsAndMeasures";
import { recipesRaw } from './recipes';
const recipes = recipesRaw as Partial<Recipe>[];
console.log("recipes", recipes);

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

chat.activity$.subscribe(console.log);

setTimeout(() => chat.send("Let's get cooking!"), 1000);

const intents = {
    instructions: {
        start: /(Let's start|Start|Let's Go|Go|I'm ready|Ready|OK|Okay)\.*/i,
        next: /(Next|What's next|next up|OK|okay|Go|Continue)/i,
        previous: /(go back|back up)/i,
        repeat: /(what's that again|huh|say that again|repeat that|please repeat that)/i,
        restart: /(start over|start again|)/i
    },
    chooseRecipe: /I want to make (?:|a|some)*\s*(.+)/i,
    queryQuantity: /how (?:many|much) (.+)/i,
}

interface State {
    recipe: Partial<Recipe>,
    lastInstructionSent: number
}

const state: Partial<State> = {};

chat.activity$
.filter(activity => activity.type === 'message')
.subscribe((message: Message) => {
    let groups: RegExpExecArray;
    // choose a recipe
    if (groups = intents.chooseRecipe.exec(message.text)) {
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
            chat.send(`Sorry, I don't know how to make ${name}. Maybe you can teach me.`);
        }
    // Answer a query about ingredient quantity
    } else if (groups = intents.queryQuantity.exec(message.text)) {
        if (!state.recipe) {
            chat.send("I can't answer that without knowing what we're making.")
        } else {
            const ingredientQuery = groups[1].split('');

            const ingredient = state.recipe.recipeIngredient
                .map<[string, number]>(i => [i, lcs(i.split(''), ingredientQuery).length])
                .reduce((prev, curr) => prev[1] > curr[1] ? prev : curr)
                [0];

            chat.send(ingredient);
        }
    // read the next instruction
    } else if (state.lastInstructionSent !== undefined && intents.instructions.next.test(message.text)) {
        const nextInstruction = state.lastInstructionSent + 1;

        if (nextInstruction < state.recipe.recipeInstructions.length) {
            chat.send(state.recipe.recipeInstructions[nextInstruction]);
            state.lastInstructionSent = nextInstruction;
            if (state.recipe.recipeInstructions.length === nextInstruction + 1)
                chat.send("That's it!");
        } else {
            chat.send("That's it!");
        }
    // repeat the current instruction
    } else if (state.lastInstructionSent !== undefined && intents.instructions.repeat.test(message.text)) {
        chat.send(state.recipe.recipeInstructions[state.lastInstructionSent]);
    // read the previous instruction
    } else if (state.lastInstructionSent !== undefined && intents.instructions.previous.test(message.text)) {
        const prevInstruction = state.lastInstructionSent - 1;

        if (prevInstruction >= 0) {
            chat.send(state.recipe.recipeInstructions[prevInstruction]);
            state.lastInstructionSent = prevInstruction;
        } else {
            chat.send("We're at the beginning.");
        }
    // start over
    } else if (state.lastInstructionSent !== undefined && intents.instructions.restart.test(message.text)) {
        state.lastInstructionSent = 0;
        chat.send(state.recipe.recipeInstructions[0]);
        if (state.recipe.recipeInstructions.length === 1)
            chat.send("That's it!");            
    // start reading the instructions
    } else if (intents.instructions.start.test(message.text)) {
        if (!state.recipe) {
            chat.send("I'm glad you're so hot to trot, but please choose a recipe first.");
        } else if (state.lastInstructionSent !== undefined) {
            if (state.lastInstructionSent + 1 === state.recipe.recipeInstructions.length) {
                chat.send("We're all done with that recipe. You can choose another recipe if you like.");
            } else {
                chat.send("We're still working on this recipe. You can continue, or choose another recipe.");
            }
        } else {
            state.lastInstructionSent = 0;
            chat.send(state.recipe.recipeInstructions[0]);
            if (state.recipe.recipeInstructions.length === 1)
                chat.send("That's it!");
        }
    } else {
        chat.send("I can't understand you. It's you, not me. Get it together and try again.");
    }
});

const recipeFromName = (name: string) =>
    recipes.find(recipe => recipe.name.toLowerCase() === name.toLowerCase());
