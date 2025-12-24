
"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { InventoryProvider } from "@/context/inventory-context-firebase";
import { UserProvider, useUser } from "@/firebase/auth/use-user";
import { usePathname } from "next/navigation";
import { Skeleton } from "../ui/skeleton";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";


function AuthLayout({ children }: { children: React.ReactNode }) {
    const { user, loading } = useUser();
    const pathname = usePathname();
    const router = useRouter();
    const auth = useAuth();

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

    if (!user.approved) {
         return (
             <div className="flex h-screen w-screen items-center justify-center flex-col gap-4 p-4 text-center">
                <div className="text-2xl font-bold">Account Pending Approval</div>
                <p className="text-muted-foreground max-w-md">
                    Your account is currently waiting for approval from an administrator. 
                    Please contact your manager or system administrator.
                </p>
                <Button onClick={() => signOut(auth)}>Sign Out</Button>
            </div>
        );
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
