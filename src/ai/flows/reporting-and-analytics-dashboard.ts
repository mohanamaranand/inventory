'use server';

/**
 * @fileOverview Generates a dashboard providing insights into stock levels, popular items, and potential discrepancies.
 *
 * - generateDashboard - A function that generates the dashboard content.
 * - DashboardInput - The input type for the generateDashboard function.
 * - DashboardOutput - The return type for the generateDashboard function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DashboardInputSchema = z.object({
  inventoryData: z.string().describe('A stringified JSON array containing the inventory data. Each object in the array should represent an inventory item with properties like item category, quantity, and sales invoice number.'),
});
export type DashboardInput = z.infer<typeof DashboardInputSchema>;

const DashboardOutputSchema = z.object({
  dashboardContent: z.string().describe('A string containing the dashboard content, including insights into stock levels, popular items, and potential discrepancies.'),
});
export type DashboardOutput = z.infer<typeof DashboardOutputSchema>;

export async function generateDashboard(input: DashboardInput): Promise<DashboardOutput> {
  return reportingAndAnalyticsDashboardFlow(input);
}

const prompt = ai.definePrompt({
  name: 'reportingAndAnalyticsDashboardPrompt',
  input: {schema: DashboardInputSchema},
  output: {schema: DashboardOutputSchema},
  prompt: `You are an AI assistant that analyzes inventory data and generates a dashboard with insights.

You will receive inventory data in JSON format. Analyze the data to identify stock levels, popular items, and potential discrepancies.

Based on your analysis, create a dashboard that provides actionable insights for the business owner to improve inventory management.

Here is the inventory data:
{{{inventoryData}}}

Present the dashboard content in a clear and concise manner. Focus on providing key metrics and recommendations.
`,
});

const reportingAndAnalyticsDashboardFlow = ai.defineFlow(
  {
    name: 'reportingAndAnalyticsDashboardFlow',
    inputSchema: DashboardInputSchema,
    outputSchema: DashboardOutputSchema,
  },
  async input => {
    try {
      // Parse the inventory data to ensure it's valid JSON.
      JSON.parse(input.inventoryData);
    } catch (e) {
      throw new Error('Invalid JSON format for inventory data: ' + e);
    }

    const {output} = await prompt(input);
    return output!;
  }
);
