
"use client";

import { Bell, Check } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

export function NotificationBell() {
  const { history, unreadCount, markAllAsRead } = useToast();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-8 w-8">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0">
        <div className="flex items-center justify-between p-4">
          <h3 className="text-lg font-semibold">Notifications</h3>
          {history.length > 0 && unreadCount > 0 && (
             <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                <Check className="mr-2 h-4 w-4" />
                Mark all as read
             </Button>
          )}
        </div>
        <Separator />
        <ScrollArea className="h-96">
          {history.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No new notifications.
            </p>
          ) : (
            <div className="flex flex-col">
              {history.map((toast) => (
                <div key={toast.id} className="border-b p-4 last:border-b-0">
                  <p className="font-semibold">{toast.title}</p>
                  {toast.description && (
                     <p className="text-sm text-muted-foreground">
                        {toast.description}
                     </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

    