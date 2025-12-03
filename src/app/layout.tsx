import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import AppLayout from '@/components/layout/app-layout';
import { InventoryProvider } from '@/context/inventory-context-firebase';
import { Suspense } from 'react';
import { FirebaseProvider } from '@/firebase/provider';

export const metadata: Metadata = {
  title: 'StockPilot',
  description: 'Your intelligent inventory management system.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased">
        <Suspense fallback={<div>Loading...</div>}>
          <FirebaseProvider>
            <InventoryProvider>
              <AppLayout>{children}</AppLayout>
            </InventoryProvider>
          </FirebaseProvider>
        </Suspense>
        <Toaster />
      </body>
    </html>
  );
}
