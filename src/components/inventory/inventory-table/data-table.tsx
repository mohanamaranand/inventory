
"use client";

import * as React from "react";
import { useSearchParams } from 'next/navigation';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  getGlobalFilteredRowModel,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ITEM_CATEGORIES, ITEM_STATUSES, InventoryItem } from "@/lib/types";
import { useInventory } from "@/context/inventory-context-firebase";
import { useToast } from "@/hooks/use-toast";
import { Trash2 } from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
  } from "@/components/ui/alert-dialog"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function DataTable<TData extends InventoryItem, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const searchParams = useSearchParams();
  const statusFilterFromURL = searchParams.get('status');
  const categoryFilterFromURL = searchParams.get('category');

  const [sorting, setSorting] = React.useState<SortingState>([]);
  
  const initialFilters: ColumnFiltersState = [];
  if (statusFilterFromURL) {
    initialFilters.push({ id: 'itemStatus', value: [statusFilterFromURL] });
  }
  if (categoryFilterFromURL) {
    initialFilters.push({ id: 'itemCategory', value: [categoryFilterFromURL] });
  }

  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialFilters);
  const [globalFilter, setGlobalFilter] = React.useState("");
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const [isAlertOpen, setIsAlertOpen] = React.useState(false);


  const { deleteMultipleItems } = useInventory();
  const { toast } = useToast();

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getGlobalFilteredRowModel: getGlobalFilteredRowModel(), 
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    globalFilterFn: 'auto',
    state: {
      sorting,
      columnFilters,
      globalFilter,
      columnVisibility,
      rowSelection,
    },
  });

  const handleDeleteSelected = (restock: boolean) => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const idsToDelete = selectedRows.map(row => row.original.id);
    deleteMultipleItems(idsToDelete, restock);
    table.resetRowSelection();
    toast({
      title: `${idsToDelete.length} Items Deleted`,
      description: `The selected items have been removed from your inventory. ${restock ? 'Parts restocked.' : ''}`,
    });
    setIsAlertOpen(false);
  };
  
  const selectedRowsContainAssembled = table.getFilteredSelectedRowModel().rows.some(row => row.original.itemCategory === 'Assembled Vehicle' || row.original.itemCategory === 'Assembled Battery');
  
  const selectAllFilteredRows = () => {
    const filteredRowIds = table.getFilteredRowModel().rows.reduce((acc, row) => {
      acc[row.id] = true;
      return acc;
    }, {} as Record<string, boolean>);
    table.setRowSelection(filteredRowIds);
  };

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center p-4 gap-4 flex-wrap">
        <Input
          placeholder="Search by name, code, invoice..."
          value={globalFilter ?? ""}
          onChange={(event) =>
            setGlobalFilter(event.target.value)
          }
          className="max-w-sm"
        />
        {table.getFilteredRowModel().rows.length > table.getState().pagination.pageSize && (
          <Button variant="outline" size="sm" onClick={selectAllFilteredRows}>
            Select All Filtered ({table.getFilteredRowModel().rows.length})
          </Button>
        )}
        {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Selected ({table.getFilteredSelectedRowModel().rows.length})
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Selected Items?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the selected items.
                            {selectedRowsContainAssembled && " For assembled items, you can choose to restock their parts."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        {selectedRowsContainAssembled && (
                            <AlertDialogAction onClick={() => handleDeleteSelected(true)}>
                                Delete & Restock Parts
                            </AlertDialogAction>
                        )}
                        <AlertDialogAction onClick={() => handleDeleteSelected(false)}>
                            Delete Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        )}
        <div className="flex gap-2 ml-auto">
            <Select
                value={(table.getColumn("itemCategory")?.getFilterValue() as string[])?.[0] ?? ""}
                onValueChange={(value) => table.getColumn("itemCategory")?.setFilterValue(value === "all" ? null : [value])}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {ITEM_CATEGORIES.map(category => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
            </Select>

            <Select
                value={(table.getColumn("itemStatus")?.getFilterValue() as string[])?.[0] ?? ""}
                onValueChange={(value) => table.getColumn("itemStatus")?.setFilterValue(value === "all" ? null : [value])}
            >
                <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    {ITEM_STATUSES.map(status => <SelectItem key={status} value={status}>{status}</SelectItem>)}
                </SelectContent>
            </Select>

            <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">Columns</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {table
                .getAllColumns()
                .filter((column) => column.getCanHide())
                .map((column) => {
                    return (
                    <DropdownMenuCheckboxItem
                        key={column.id}
                        className="capitalize"
                        checked={column.getIsVisible()}
                        onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                        }
                    >
                        {column.id === 'id' ? 'S.No' : column.id}
                    </DropdownMenuCheckboxItem>
                    );
                })}
            </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>
      <div className="border-t">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 p-4 border-t">
        <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of{" "}
            {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
