
"use client";

import { useState } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Warehouse, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
    const auth = useAuth();
    const db = useFirestore();
    const { toast } = useToast();
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [signUpEmail, setSignUpEmail] = useState('');
    const [signUpPassword, setSignUpPassword] = useState('');
    const [signUpRole, setSignUpRole] = useState('employee');
    const [loading, setLoading] = useState(false);
    const [showLoginPassword, setShowLoginPassword] = useState(false);
    const [showSignUpPassword, setShowSignUpPassword] = useState(false);

    const handleSignIn = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
            // The redirect will be handled by the AppLayout component
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
            const userCredential = await createUserWithEmailAndPassword(auth, signUpEmail, signUpPassword);
            const user = userCredential.user;

            const isSuperAdmin = signUpEmail.toLowerCase() === 'shreechakra.e.m@gmail.com';

            // Create user document in Firestore
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                email: user.email,
                role: isSuperAdmin ? 'owner' : signUpRole,
                approved: isSuperAdmin ? true : false,
            });

            toast({
                title: 'Account Created',
                description: "You have been successfully signed up. Please wait for an administrator to approve your account.",
            });
            // Switch to sign-in tab after successful sign-up could be a good UX improvement,
            // but for now, we just clear the form.
            setSignUpEmail('');
            setSignUpPassword('');
            setSignUpRole('employee');
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
                                    <div className="relative">
                                        <Input 
                                            id="login-password" 
                                            type={showLoginPassword ? "text" : "password"} 
                                            required 
                                            value={loginPassword} 
                                            onChange={(e) => setLoginPassword(e.target.value)} 
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                                        >
                                            {showLoginPassword ? (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span className="sr-only">
                                                {showLoginPassword ? "Hide password" : "Show password"}
                                            </span>
                                        </Button>
                                    </div>
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
                                    <div className="relative">
                                        <Input 
                                            id="signup-password" 
                                            type={showSignUpPassword ? "text" : "password"} 
                                            required 
                                            value={signUpPassword} 
                                            onChange={(e) => setSignUpPassword(e.target.value)} 
                                            className="pr-10"
                                        />
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                            onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                                        >
                                            {showSignUpPassword ? (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Eye className="h-4 w-4 text-muted-foreground" />
                                            )}
                                            <span className="sr-only">
                                                {showSignUpPassword ? "Hide password" : "Show password"}
                                            </span>
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Account Type</Label>
                                    <RadioGroup defaultValue="employee" value={signUpRole} onValueChange={setSignUpRole} className="flex flex-row space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="employee" id="role-employee" />
                                            <Label htmlFor="role-employee">Employee</Label>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <RadioGroupItem value="owner" id="role-owner" />
                                            <Label htmlFor="role-owner">Owner</Label>
                                        </div>
                                    </RadioGroup>
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
