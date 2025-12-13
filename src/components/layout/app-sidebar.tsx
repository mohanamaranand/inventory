
"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationBell } from "@/components/layout/notification-bell";
import { useUser } from "@/firebase/auth/use-user";
import { useAuth } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "../ui/dropdown-menu";

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
  const router = useRouter();
  const { user, loading } = useUser();
  const auth = useAuth();
  
  const handleSignOut = async () => {
    await auth.signOut();
    router.push('/login');
  };

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
             {!loading && user && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                                <AvatarFallback>
                                    <UserIcon />
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleSignOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>Log out</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
             )}
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
