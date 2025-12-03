
"use client";

import { useMemo } from "react";
import { useInventory } from "@/context/inventory-context-firebase";
import { DataTable } from "./reports-table/data-table";
import { columns } from "./reports-table/columns";
import { OTHER_STATUSES } from "@/lib/types";

export function ReportsClient() {
    const { inventory } = useInventory();

    const reportedItems = useMemo(() => {
        return inventory.filter(item => OTHER_STATUSES.includes(item.itemStatus));
    }, [inventory]);

    return <DataTable columns={columns} data={reportedItems} />;
}
