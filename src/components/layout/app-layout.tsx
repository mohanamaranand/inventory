
"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { InventoryProvider } from "@/context/inventory-context-firebase";
import { UserProvider, useUser } from "@/firebase/auth/use-user";
import { usePathname } from "next/navigation";
import { Skeleton } from "../ui/skeleton";
import { useEffect } from "react";
import { useRouter } from "next/navigation";


function AuthLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !user && pathname !== '/login') {
            router.push('/login');
        }
        if (!loading && user && pathname === '/login') {
            router.push('/dashboard');
        }
    }, [user, loading, pathname, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-screen items-center justify-center">
                <Skeleton className="h-full w-full" />
            </div>
        );
    }
    
    if (!user && pathname !== '/login') {
        return (
             <div className="flex h-screen w-screen items-center justify-center">
                <Skeleton className="h-full w-full" />
            </div>
        );
    }
    
    if (pathname === '/login') {
        return <>{children}</>;
    }
    
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <main className="min-h-screen p-4 sm:p-6 lg:p-8">{children}</main>
            </SidebarInset>
      </SidebarProvider>
    )
}


export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <UserProvider>
        <InventoryProvider>
            <AuthLayout>{children}</AuthLayout>
        </InventoryProvider>
    </UserProvider>
  );
}
