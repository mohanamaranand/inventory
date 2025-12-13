
'use client';

import { Suspense } from 'react';
import { Header } from '@/components/layout/header';
import { Skeleton } from '@/components/ui/skeleton';
import { InventoryClient } from '@/components/inventory/inventory-client';

export default function InventoryPage() {
  return (
    <>
      <Header title="Inventory" />
      <Suspense fallback={<Skeleton className="h-[700px] w-full" />}>
        <InventoryClient />
      </Suspense>
    </>
  );
}
