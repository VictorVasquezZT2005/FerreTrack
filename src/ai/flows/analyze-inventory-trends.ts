
'use server';

/**
 * @fileOverview Analyzes inventory trends and predicts potential stockouts.
 *
 * - analyzeInventoryTrends - A function that analyzes inventory and predicts stockouts.
 * - AnalyzeInventoryTrendsInput - The input type for the analyzeInventoryTrends function.
 * - AnalyzeInventoryTrendsOutput - The return type for the analyzeInventoryTrends function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzeInventoryTrendsInputSchema = z.array(
  z.object({
    item: z.string().describe('The name of the item.'),
    quantity: z.number().describe('The current quantity of the item.'),
    stockMinimo: z.number().describe('The minimum stock level for the item.'), // Changed from reorderPoint
    dailySales: z.number().describe('The average daily sales of the item.'),
  })
).describe('An array of inventory items with their quantities, minimum stock levels, and daily sales.');

export type AnalyzeInventoryTrendsInput = z.infer<typeof AnalyzeInventoryTrendsInputSchema>;

const AnalyzeInventoryTrendsOutputSchema = z.object({
  summary: z.string().describe('A summary of the inventory analysis, including potential stockouts and recommended actions.'),
  stockoutPredictions: z.array(
    z.object({
      item: z.string().describe('The name of the item.'),
      daysUntilStockout: z.number().describe('The number of days until the item is expected to stockout.'),
      recommendedOrderQuantity: z.number().describe('The recommended order quantity to avoid stockout.'),
    })
  ).describe('An array of stockout predictions for each item.'),
});

export type AnalyzeInventoryTrendsOutput = z.infer<typeof AnalyzeInventoryTrendsOutputSchema>;

export async function analyzeInventoryTrends(input: AnalyzeInventoryTrendsInput): Promise<AnalyzeInventoryTrendsOutput> {
  return analyzeInventoryTrendsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeInventoryTrendsPrompt',
  input: {schema: AnalyzeInventoryTrendsInputSchema},
  output: {schema: AnalyzeInventoryTrendsOutputSchema},
  prompt: `You are an expert inventory analyst for a hardware store (ferretería). Analyze the current inventory levels and predict potential stockouts. Provide a summary of your analysis and suggest reorder quantities to avoid stockouts. Use the following inventory data:

Inventory Data:
{{#each this}}
- Item: {{this.item}}, Quantity: {{this.quantity}}, Minimum Stock: {{this.stockMinimo}}, Daily Sales: {{this.dailySales}}
{{/each}}

Analyze the data and provide:
1. A summary of the overall inventory situation, highlighting any potential issues.
2. A list of items that are likely to stockout soon, including the number of days until stockout and the recommended order quantity to avoid stockout. Calculate the daysUntilStockout by (quantity - stockMinimo) / dailySales. If the result is negative, report 0. Calculate the recommendedOrderQuantity by stockMinimo + (dailySales * 30). The recommended order quantity should be rounded to the nearest whole number.

Format your response as a JSON object with a "summary" field and a "stockoutPredictions" field. The "stockoutPredictions" field should be an array of objects, each containing the item name, days until stockout, and recommended order quantity.

Make sure that numbers in the JSON response are represented as numbers, not strings.
`, 
});

const analyzeInventoryTrendsFlow = ai.defineFlow(
  {
    name: 'analyzeInventoryTrendsFlow',
    inputSchema: AnalyzeInventoryTrendsInputSchema,
    outputSchema: AnalyzeInventoryTrendsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
