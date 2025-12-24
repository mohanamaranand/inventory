
"use client";

import { useInventory } from "@/context/inventory-context-firebase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ShoppingCart, PackagePlus, Wrench, CheckCheck } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
import { SOLD_STATUSES } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type ActivityType = 'sale' | 'restock' | 'assembly';

interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  date: Date;
  details: string;
}

export function RecentActivity() {
  const { inventory } = useInventory();
  const [lastViewed, setLastViewed] = useState<Date | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem('stockpilot_last_viewed_activity');
    if (stored) {
        setLastViewed(new Date(stored));
    } else {
        // Default to 24 hours ago if never visited
        setLastViewed(new Date(Date.now() - 24 * 60 * 60 * 1000));
    }
  }, []);

  const handleMarkAsRead = () => {
    const now = new Date();
    setLastViewed(now);
    localStorage.setItem('stockpilot_last_viewed_activity', now.toISOString());
  };

  const activities = useMemo(() => {
    const list: Activity[] = [];

    inventory.forEach(item => {
      // Sale Activity
      if (SOLD_STATUSES.includes(item.itemStatus) && item.salesDate) {
        const date = item.salesDate instanceof Timestamp ? item.salesDate.toDate() : new Date(item.salesDate);
        list.push({
          id: `sale-${item.id}`,
          type: 'sale',
          description: `Sold ${item.quantity}x ${item.productName}`,
          date: date,
          details: `Invoice: ${item.salesInvoiceNumber || 'N/A'}`
        });
      }

      // Restock/Purchase Activity
      if (item.purchaseDate) {
         const date = item.purchaseDate instanceof Timestamp ? item.purchaseDate.toDate() : new Date(item.purchaseDate);
         const isAssembly = item.itemCategory === 'Assembled Vehicle' || item.itemCategory === 'Assembled Battery';
         
         // Only consider it a "recent activity" if it's somewhat recent (e.g., within last 30 days) to avoid cluttering with old purchases
         // But for the sake of the list, we sort by date anyway.
         
         list.push({
            id: `add-${item.id}`,
            type: isAssembly ? 'assembly' : 'restock',
            description: `${isAssembly ? 'Assembled' : 'Added'} ${item.quantity}x ${item.productName}`,
            date: date,
            details: isAssembly ? 'Production' : `Vendor: ${item.vendorName}`
         });
      }
    });

    return list.sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 20);
  }, [inventory]);

  const hasUnread = useMemo(() => {
      if (!lastViewed || activities.length === 0) return false;
      return activities[0].date > lastViewed;
  }, [activities, lastViewed]);

  if (!mounted) return null;

  return (
    <Card className="col-span-1 h-[500px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest transactions and updates.</CardDescription>
        </div>
        {hasUnread && (
            <Button variant="ghost" size="sm" onClick={handleMarkAsRead} className="h-8 text-xs text-muted-foreground">
                <CheckCheck className="mr-2 h-3 w-3" />
                Mark read
            </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden pt-4">
        <ScrollArea className="h-full pr-4">
          <div className="space-y-6">
            {activities.map((activity) => {
               const isNew = lastViewed ? activity.date > lastViewed : false;
               return (
                  <div key={activity.id} className={`flex items-start gap-4 p-2 rounded-lg transition-colors ${isNew ? 'bg-muted/50' : ''}`}>
                    <div className={`mt-1 rounded-full p-2 ring-1 ring-white shrink-0 ${
                        activity.type === 'sale' ? 'bg-blue-100 text-blue-600' : 
                        activity.type === 'assembly' ? 'bg-purple-100 text-purple-600' : 
                        'bg-green-100 text-green-600'
                    }`}>
                        {activity.type === 'sale' && <ShoppingCart className="h-4 w-4" />}
                        {activity.type === 'restock' && <PackagePlus className="h-4 w-4" />}
                        {activity.type === 'assembly' && <Wrench className="h-4 w-4" />}
                    </div>
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                          <p className="text-sm font-medium leading-none truncate">{activity.description}</p>
                          {isNew && <Badge variant="default" className="h-4 px-1 text-[10px]">New</Badge>}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-xs text-muted-foreground">
                        <span>{formatDistanceToNow(activity.date, { addSuffix: true })}</span>
                        <span className="hidden sm:inline">•</span>
                        <span className="truncate">{activity.details}</span>
                      </div>
                    </div>
                  </div>
               );
            })}
             {activities.length === 0 && (
                <div className="text-center text-muted-foreground py-8">No recent activity.</div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
