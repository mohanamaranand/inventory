
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
        if (loading) return; // Wait for the auth state to be determined

        if (!user && pathname !== '/login') {
            router.push('/login');
        }
        if (user && pathname === '/login') {
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
    
    // If we are on the login page, just render children (the login page itself)
    if (pathname === '/login') {
        return <>{children}</>;
    }

    // If we are not loading, but there's no user and we are not on the login page,
    // we return null because the useEffect will handle the redirect.
    // This prevents rendering the main layout for a split second before redirecting.
    if (!user) {
        return null;
    }
    
    // If we have a user, render the full application layout.
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
