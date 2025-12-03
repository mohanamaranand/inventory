
"use client";

import { useMemo } from "react";
import { useInventory } from "@/context/inventory-context-firebase";
import { DataTable } from "./sales-table/data-table";
import { columns } from "./sales-table/columns";
import { SOLD_STATUSES } from "@/lib/types";

export function SalesClient() {
    const { inventory } = useInventory();

    const soldItems = useMemo(() => {
        return inventory.filter(item => SOLD_STATUSES.includes(item.itemStatus));
    }, [inventory]);

    return <DataTable columns={columns} data={soldItems} />;
}
