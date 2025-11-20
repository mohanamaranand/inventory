"use client";

import { useState } from "react";
import { useInventory } from "@/context/inventory-context";
import { generateDashboard } from "@/ai/flows/reporting-and-analytics-dashboard";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AnalyticsDashboard() {
  const { inventory } = useInventory();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);

  const handleGenerateReport = async () => {
    setLoading(true);
    setReport(null);
    try {
      const inventoryData = JSON.stringify(inventory);
      const result = await generateDashboard({ inventoryData });
      setReport(result.dashboardContent);
    } catch (error) {
      console.error("Error generating dashboard:", error);
      toast({
        variant: "destructive",
        title: "Generation Failed",
        description: "Could not generate the analytics report.",
      });
    }
    setLoading(false);
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle>Reporting & Analytics</CardTitle>
        <CardDescription>
          Use generative AI to get insights into stock levels, popular items,
          and potential discrepancies.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center rounded-md border border-dashed p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        {!loading && report && (
          <Alert>
            <Lightbulb className="h-4 w-4" />
            <AlertTitle>AI-Generated Report</AlertTitle>
            <AlertDescription>
              <pre className="whitespace-pre-wrap font-sans text-sm">{report}</pre>
            </AlertDescription>
          </Alert>
        )}
        {!loading && !report && (
            <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
                <Lightbulb className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground">
                    Click the button to generate your inventory report.
                </p>
            </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerateReport} disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...
            </>
          ) : (
            "Generate Insights"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
