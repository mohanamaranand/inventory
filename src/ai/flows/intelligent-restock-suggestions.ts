
'use server';

/**
 * @fileOverview This file defines a Genkit flow for providing intelligent restocking suggestions based on historical sales data and current inventory levels.
 *
 * - intelligentRestockSuggestions - A function that takes inventory data as input and returns restocking suggestions.
 * - IntelligentRestockSuggestionsInput - The input type for the intelligentRestockSuggestions function.
 * - IntelligentRestockSuggestionsOutput - The return type for the intelligentRestockSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define the schema for a single inventory item
const InventoryItemSchema = z.object({
  productName: z.string().describe('The name of the product.'),
  quantity: z.number().describe('The current quantity in stock.'),
  itemCategory: z.string().describe('The category of the item.'),
  storageLocation: z.string().describe('The location where the item is stored.'),
});

// Define the input schema for the flow, which is an array of inventory items
const IntelligentRestockSuggestionsInputSchema = z.array(InventoryItemSchema).describe('An array of inventory items with their details.');
export type IntelligentRestockSuggestionsInput = z.infer<typeof IntelligentRestockSuggestionsInputSchema>;

// Define the output schema for the flow, which is an array of restocking suggestions
const RestockSuggestionSchema = z.object({
  productName: z.string().describe('The name of the product to restock.'),
  suggestedQuantity: z.number().describe('The suggested quantity to restock.'),
  reason: z.string().describe('The reason for the restock suggestion.'),
});

const IntelligentRestockSuggestionsOutputSchema = z.array(RestockSuggestionSchema).describe('An array of restocking suggestions.');
export type IntelligentRestockSuggestionsOutput = z.infer<typeof IntelligentRestockSuggestionsOutputSchema>;

// Exported function to call the flow
export async function intelligentRestockSuggestions(input: IntelligentRestockSuggestionsInput): Promise<IntelligentRestockSuggestionsOutput> {
  return intelligentRestockSuggestionsFlow(input);
}

// Define the prompt for the LLM
const restockPrompt = ai.definePrompt({
  name: 'restockPrompt',
  input: {schema: IntelligentRestockSuggestionsInputSchema},
  output: {schema: IntelligentRestockSuggestionsOutputSchema},
  prompt: `You are an AI assistant that provides restocking suggestions for a store manager.

  Analyze the following inventory data and provide a list of restocking suggestions, including the product name, suggested quantity to restock, and the reason for the suggestion.
  Consider current inventory levels and storage locations to optimize restocking.

  Here is the inventory data:
  {{#each this}}
  - Product Name: {{{productName}}}, Quantity: {{{quantity}}}, Category: {{{itemCategory}}}, Storage Location: {{{storageLocation}}}
  {{/each}}

  Provide the output in JSON format.
  Ensure that suggestedQuantity is a number and the reason is a string.
  `, 
});

// Define the Genkit flow
const intelligentRestockSuggestionsFlow = ai.defineFlow(
  {
    name: 'intelligentRestockSuggestionsFlow',
    inputSchema: IntelligentRestockSuggestionsInputSchema,
    outputSchema: IntelligentRestockSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await restockPrompt(input);
    return output!;
  }
);
