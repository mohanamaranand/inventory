
"use client";

import { Suspense } from "react";
import { Header } from "@/components/layout/header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { VehicleAssembly } from "@/components/assembly/vehicle/vehicle-assembly";
import { BatteryAssembly } from "@/components/assembly/battery/battery-assembly";

function AssemblyPageContent() {
  return (
    <>
      <Header title="Assembly">
      </Header>

      <Tabs defaultValue="vehicle">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="vehicle">Vehicle Assembly</TabsTrigger>
          <TabsTrigger value="battery">Battery Assembly</TabsTrigger>
        </TabsList>
        <TabsContent value="vehicle">
          <VehicleAssembly />
        </TabsContent>
        <TabsContent value="battery">
          <BatteryAssembly />
        </TabsContent>
      </Tabs>
    </>
  );
}

export default function AssemblyPage() {
    return (
        <Suspense fallback={
            <>
                <Header title="Assembly" />
                <Skeleton className="h-[700px] w-full" />
            </>
        }>
            <AssemblyPageContent />
        </Suspense>
    )
}
