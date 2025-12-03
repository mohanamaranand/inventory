"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { InventoryProvider } from "@/context/inventory-context-firebase";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <InventoryProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <main className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </InventoryProvider>
  );
}
