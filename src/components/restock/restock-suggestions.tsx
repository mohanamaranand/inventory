
"use client";

import { useEffect, useState } from "react";
import { useInventory } from "@/context/inventory-context-firebase";
import { intelligentRestockSuggestions, type IntelligentRestockSuggestionsOutput } from "@/ai/flows/intelligent-restock-suggestions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Lightbulb, Loader2, Package, Truck, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Timestamp } from "firebase/firestore";

export function RestockSuggestions() {
  const { inventory } = useInventory();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<IntelligentRestockSuggestionsOutput>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (inventory.length === 0) {
        setLoading(false);
        setSuggestions([]);
        return;
      };
      setLoading(true);
      try {
        const inventoryForAI = inventory.map(item => ({
            ...item,
            salesData: item.salesData || [],
            date: item.purchaseDate instanceof Timestamp ? item.purchaseDate.toDate().toISOString() : item.purchaseDate.toString(),
        }));
        
        const result = await intelligentRestockSuggestions(inventoryForAI);
        setSuggestions(result);
      } catch (error) {
        console.error("Error fetching restock suggestions:", error);
        toast({
          variant: "destructive",
          title: "Suggestion Generation Failed",
          description: "Could not generate restock suggestions at this time.",
        });
      }
      setLoading(false);
    };

    fetchSuggestions();
  }, [inventory, toast]);

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed p-12 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="mt-4 text-lg font-medium">Analyzing Inventory...</p>
            <p className="text-sm text-muted-foreground">The AI is looking for items to restock.</p>
        </div>
    )
  }

  if (suggestions.length === 0) {
    return (
      <Alert>
        <Package className="h-4 w-4" />
        <AlertTitle>All Good!</AlertTitle>
        <AlertDescription>
          No restock suggestions at the moment. Your inventory seems to be well-stocked.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {suggestions.map((suggestion, index) => (
        <Card key={index} className="shadow-md transition-all hover:shadow-lg">
          <CardHeader>
            <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{suggestion.productName}</CardTitle>
                <Truck className="h-6 w-6 text-primary" />
            </div>
            <CardDescription>
              Suggested Quantity: <span className="font-bold text-foreground">{suggestion.suggestedQuantity} units</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="default" className="bg-primary/5">
                <Info className="h-4 w-4" />
                <AlertTitle>Reason</AlertTitle>
                <AlertDescription>{suggestion.reason}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
