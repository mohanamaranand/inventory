
"use client";

import { useState } from "react";
import { useAuth } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Warehouse, LogIn, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
    const auth = useAuth();
    const { toast } = useToast();
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [signUpEmail, setSignUpEmail] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
        } catch (error: any) {
            console.error("Sign-in error:", error);
            toast({
                variant: 'destructive',
                title: 'Sign-in Failed',
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
            toast({
                title: 'Account Created',
                description: "You have been successfully signed up. Please sign in.",
            });
        } catch (error: any) {
            console.error("Sign-up error:", error);
            toast({
                variant: 'destructive',
                title: 'Sign-up Failed',
                description: error.message,
            });
        } finally {
            setLoading(false);
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
                    <Tabs defaultValue="signin">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="signin">Sign In</TabsTrigger>
                            <TabsTrigger value="signup">Sign Up</TabsTrigger>
                        </TabsList>
                        <TabsContent value="signin">
                            <form onSubmit={handleSignIn} className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-email">Email</Label>
                                    <Input id="login-email" type="email" placeholder="m@example.com" required value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password">Password</Label>
                                    <Input id="login-password" type="password" required value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} />
                                </div>
                                <Button type="submit" className="w-full" disabled={loading}>
                                    <LogIn className="mr-2 h-4 w-4" />
                                    {loading ? "Signing In..." : "Sign In"}
                                </Button>
                            </form>
                        </TabsContent>
                        <TabsContent value="signup">
                            <form onSubmit={handleSignUp} className="space-y-4 pt-4">
                               <div className="space-y-2">
                                    <Label htmlFor="signup-email">Email</Label>
                                    <Input id="signup-email" type="email" placeholder="m@example.com" required value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">Password</Label>
                                    <Input id="signup-password" type="password" required value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} />
                                </div>
                                <Button type="submit" className="w-full" variant="secondary" disabled={loading}>
                                     <UserPlus className="mr-2 h-4 w-4" />
                                     {loading ? "Creating Account..." : "Create Account"}
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
