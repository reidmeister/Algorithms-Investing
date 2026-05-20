"use client";

import { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table-column-header";

export interface EMAScanResult {
  symbol: string;
  security: string;
  industry: string;
  date: Date;
  buyPrice: number;
  curPrice: number;
}

export const scannerColumns: ColumnDef<EMAScanResult>[] = [
  {
    accessorKey: "symbol",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Symbol" />,
    cell: ({ row }) => <div>{row.getValue("symbol") as string}</div>,
    enableHiding: false,
  },
  {
    accessorKey: "security",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Stock Name" />,
    cell: ({ row }) => <div>{row.getValue("security") as string}</div>,
    enableHiding: false,
  },
  {
    accessorKey: "industry",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sector" />,
    cell: ({ row }) => <div>{row.getValue("industry") as string}</div>,
    enableHiding: false,
  },
  {
    accessorKey: "date",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Date of Crossover" />,
    cell: ({ row }) => {
      const date = new Date(row.getValue("date"));
      return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    },
    enableHiding: false,
  },
  {
    accessorKey: "buyPrice",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Price at Crossover" />,
    cell: ({ row }) => <div>{Number(row.getValue("buyPrice")).toFixed(3)}</div>,
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "curPrice",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Current Price" />,
    cell: ({ row }) => <div>{Number(row.getValue("curPrice")).toFixed(3)}</div>,
    enableSorting: false,
    enableHiding: false,
  },
];
