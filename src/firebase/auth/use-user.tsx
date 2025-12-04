
'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useMemo } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { useAuth, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { User, UserRole } from '@/lib/types';
import { doc } from 'firebase/firestore';

interface UserContextType {
  user: User | null;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const auth = useAuth();
  const db = useFirestore();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [auth]);
  
  const userDocRef = useMemoFirebase(() => {
    if (!db || !firebaseUser) return null;
    return doc(db, 'users', firebaseUser.uid);
  }, [db, firebaseUser]);
  
  const { data: userProfile, isLoading: loadingProfile } = useDoc<User>(userDocRef);

  const user = useMemo(() => {
    if (!firebaseUser) return null;
    return {
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || userProfile?.displayName || firebaseUser.email,
      photoURL: firebaseUser.photoURL,
      role: userProfile?.role || null,
    };
  }, [firebaseUser, userProfile]);

  const loading = loadingAuth || loadingProfile;

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
