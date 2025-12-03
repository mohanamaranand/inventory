
'use client';

import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryPageContent } from '@/components/inventory/inventory-page-content';


export default function InventoryPage() {
  return (
    <Suspense
      fallback={
        <>
          <Header title="Inventory" />
          <Skeleton className="h-[700px] w-full" />
        </>
      }
    >
      <InventoryPageContent />
    </Suspense>
  );
}
