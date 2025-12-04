"use client";

import { useAuth } from "@/firebase";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse, Chrome } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
    const auth = useAuth();
    const { toast } = useToast();

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error: any) {
            console.error("Google sign-in error:", error);
            toast({
                variant: 'destructive',
                title: 'Sign-in Failed',
                description: error.message,
            })
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-muted/40">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center">
                    <div className="mb-4 flex justify-center">
                        <Warehouse className="h-12 w-12 text-primary" />
                    </div>
                    <CardTitle className="text-3xl font-bold">Welcome to StockPilot</CardTitle>
                    <CardDescription>Your intelligent inventory management system.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button onClick={handleGoogleSignIn} className="w-full" size="lg">
                        <Chrome className="mr-2 h-5 w-5" />
                        Sign in with Google
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
