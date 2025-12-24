
"use client";

import { useUser } from "@/firebase/auth/use-user";
import { useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { useCollection } from "@/firebase/firestore/use-collection"; // Hook
import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Check, X, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function UsersManagementClient() {
    const { user, loading: userLoading } = useUser();
    const db = useFirestore();
    const { toast } = useToast();
    const router = useRouter();

    const usersQuery = useMemoFirebase(() => db ? collection(db, 'users') : null, [db]);
    const { data: users, isLoading: usersLoading } = useCollection<User>(usersQuery);

    useEffect(() => {
        if (!userLoading && user?.role !== 'owner') {
             router.push('/dashboard');
        }
    }, [user, userLoading, router]);

    if (userLoading || usersLoading) {
        return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
    }

    if (user?.role !== 'owner') {
        return <div>Access Denied</div>;
    }

    const handleApprove = async (userId: string, currentStatus: boolean) => {
        if (!db) return;
        try {
            await updateDoc(doc(db, 'users', userId), { approved: !currentStatus });
            toast({ title: "Status Updated", description: "User approval status changed." });
        } catch (error: any) {
            toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };
    
    const handleDelete = async (userId: string) => {
        if (!db) return;
        if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(db, 'users', userId));
            toast({ title: "User Deleted", description: "User account has been removed." });
        } catch (error: any) {
             toast({ variant: "destructive", title: "Error", description: error.message });
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
                <p className="text-muted-foreground">Approve or manage user accounts.</p>
            </div>
            
            <div className="rounded-md border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users?.map((u) => (
                            <TableRow key={u.uid}>
                                <TableCell>{u.email}</TableCell>
                                <TableCell className="capitalize">{u.role}</TableCell>
                                <TableCell>
                                    <Badge variant={u.approved ? "default" : "secondary"}>
                                        {u.approved ? "Active" : "Pending"}
                                    </Badge>
                                </TableCell>
                                <TableCell className="flex items-center gap-2">
                                    {!u.approved && (
                                        <Button size="sm" onClick={() => handleApprove(u.uid, u.approved)}>
                                            <Check className="mr-1 h-4 w-4" /> Approve
                                        </Button>
                                    )}
                                    {u.approved && (
                                         <Button size="sm" variant="outline" onClick={() => handleApprove(u.uid, u.approved)}>
                                            <X className="mr-1 h-4 w-4" /> Revoke
                                        </Button>
                                    )}
                                     <Button size="sm" variant="destructive" onClick={() => handleDelete(u.uid)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                         {!users?.length && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center h-24">
                                    No users found.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
