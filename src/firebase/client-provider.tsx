'use client';

import { Suspense } from "react";
import { FirebaseProvider } from './provider';

// This component is a wrapper that ensures the FirebaseProvider is only rendered on the client.
// This is crucial to prevent hydration errors in Next.js, as Firebase initialization relies
// on browser-specific APIs that aren't available on the server.
export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<div>Loading Firebase...</div>}>
        <FirebaseProvider>{children}</FirebaseProvider>
    </Suspense>
  );
}
