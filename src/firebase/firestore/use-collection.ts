'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  where,
  type Query,
  type DocumentData,
  type Firestore,
  type WhereFilterOp,
} from 'firebase/firestore';
import { useFirestore } from '..';

interface QueryConstraint {
  field: string;
  operator: WhereFilterOp;
  value: any;
}

export function useCollection<T>(
  collectionName: string,
  ...queryConstraints: QueryConstraint[]
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const db = useFirestore();

  const q = useMemo(() => {
    const constraints = queryConstraints.map((c) => where(c.field, c.operator, c.value));
    return query(collection(db, collectionName), ...constraints);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, collectionName, JSON.stringify(queryConstraints)]);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const documents = querySnapshot.docs.map((doc) => {
          const docData = doc.data();
          // Convert Timestamps to Dates
          Object.keys(docData).forEach(key => {
            if (docData[key] instanceof Object && 'seconds' in docData[key] && 'nanoseconds' in docData[key]) {
              docData[key] = docData[key].toDate();
            }
          });
          return { id: doc.id, ...docData } as T;
        });
        setData(documents);
        setLoading(false);
      },
      (err) => {
        console.error(`Error fetching collection ${collectionName}:`, err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [q, collectionName]);

  return { data, loading, error };
}

export function useDoc<T>(collectionName: string, docId: string) {
    const { data, loading, error } = useCollection<T>(collectionName, { field: 'id', operator: '==', value: docId });
    return { data: data?.[0], loading, error };
}
