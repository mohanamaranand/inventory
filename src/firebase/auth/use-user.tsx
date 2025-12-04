
'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { User, UserRole } from '@/lib/types';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc, Firestore, getFirestore } from 'firebase/firestore';
import { useFirebaseApp } from '../provider';

interface UserContextType {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

async function getUserRole(db: Firestore, uid: string): Promise<UserRole> {
    const adminRoleRef = doc(db, 'roles_admin', uid);
    const adminDoc = await getDoc(adminRoleRef);
    if (adminDoc.exists()) {
        return 'administrator';
    }
    // You can add more role checks here if needed, e.g., for 'owner'
    return 'employee';
}


export const UserProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const firebaseApp = useFirebaseApp();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore(firebaseApp);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const role = await getUserRole(db, firebaseUser.uid);
        
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email,
          photoURL: firebaseUser.photoURL,
          role,
        });

      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [auth, firebaseApp]);

  return (
    <UserContext.Provider value={{ user, loading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
