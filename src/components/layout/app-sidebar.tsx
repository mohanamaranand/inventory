
"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Boxes,
  Truck,
  Warehouse,
  Wrench,
  Database,
  ShoppingCart,
  Users,
  ClipboardList,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";

const menuItems = [
  {
    href: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    href: "/inventory",
    icon: Boxes,
    label: "Inventory",
  },
  {
    href: "/customers",
    icon: Users,
    label: "Customers",
  },
  {
    href: "/sales",
    icon: ShoppingCart,
    label: "Sales",
  },
  {
    href: "/assembly",
    icon: Wrench,
    label: "Assembly",
  },
  {
    href: "/restock",
    icon: Truck,
    label: "Restock Suggestions",
  },
  {
      href: "/reports",
      icon: ClipboardList,
      label: "Reports"
  },
  {
    href: "/data",
    icon: Database,
    label: "Data Management",
  }
];

export function AppSidebar() {
  const pathname = usePathname();
  const isMobile = useIsMobile();

  return (
    <Sidebar collapsible="icon" side="left" variant="sidebar">
      <SidebarHeader>
        <div className="flex w-full items-center justify-between gap-2 overflow-hidden px-2">
          <div className="flex items-center gap-2">
            <Warehouse className="size-6 shrink-0 text-primary" />
            <span className="text-lg font-semibold">StockPilot</span>
          </div>
          <div className="flex items-center">
            <NotificationBell />
          </div>
        </div>
      </SidebarHeader>
      <SidebarMenu className="flex-1">
        {menuItems.map((item) => (
          <SidebarMenuItem key={item.href}>
            <Button
              asChild
              variant="ghost"
              className="w-full justify-start"
              aria-current={pathname.startsWith(item.href) ? "page" : undefined}
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            </Button>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </Sidebar>
  );
}
