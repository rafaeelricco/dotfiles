export { DataTable, ColumnDef, ColumnsConfig };

import * as React from "react";

import { Nullable } from "@ambarltd/core/nullable";
import { ArrowUpDown, ArrowDownWideNarrow, ArrowDownNarrowWide } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SortFun<T> = (x: T, y: T) => number;

class ColumnDef<T> {
  constructor(
    readonly values: {
      label: React.ReactNode;
      sortFun: Nullable<SortFun<T>>;
    },
  ) {}
}

type ColumnsConfig<T> = {
  [k: string]: ColumnDef<T>;
};

function ColumnsConfig<T, C extends ColumnsConfig<T>>(v: C): C {
  return v;
}

type Row<T, C extends ColumnsConfig<T>> = {
  variant?: "selected" | "disabled" | "default";
  className?: string;
  value: T;
  contents: { [K in keyof C]: React.ReactNode };
  onClick?: (rowData: T) => void;
};

type Pagination = {
  page: number;
  pageSize: number;
  setPage: (n: number) => void;
};

type DataTableProps<T, C extends ColumnsConfig<T>> = {
  emptyMessage: React.ReactNode;
  columnOrder: (keyof C)[];
  columns: C;
  rows: Row<T, C>[];
  pagination?: Pagination;
  isTableFixed?: boolean;
  defaultSort?: SortState<C>;
};

type SortState<C> =
  | { sorting: "increasing"; column: keyof C }
  | { sorting: "decreasing"; column: keyof C }
  | { sorting: "unsorted"; column: null };

const noSorting: SortFun<unknown> = () => 0;
function reverseSort<T>(f: SortFun<T>): SortFun<T> {
  return (x, y) => -1 * f(x, y);
}

function getPage<T>({ page, pageSize, rows }: { page: number; pageSize: number; rows: Array<T> }): Array<T> {
  const start = page * pageSize;
  return rows.slice(start, start + pageSize);
}

const ellipsis = "overflow-hidden text-ellipsis whitespace-nowrap";

function DataTable<T, C extends ColumnsConfig<T>>({
  emptyMessage,
  columns,
  columnOrder,
  rows,
  isTableFixed = false,
  pagination: pg,
  defaultSort = { sorting: "unsorted", column: null },
}: DataTableProps<T, C>): React.ReactNode {
  const [sortState, setSortState_] = React.useState<SortState<C>>(defaultSort);

  const sortFun: SortFun<T> =
    sortState.sorting === "increasing" ? columns[sortState.column]?.values.sortFun || noSorting
    : sortState.sorting === "decreasing" ? reverseSort(columns[sortState.column]?.values.sortFun || noSorting)
    : noSorting;

  const sortedRows = rows.sort((x, y) => sortFun(x.value, y.value));

  const hasPagination = pg !== undefined;
  const { page, pageSize, setPage }: Pagination = pg || { page: 0, pageSize: sortedRows.length, setPage: _ => {} };
  const maxPage = Math.max(0, Math.floor((sortedRows.length - 1) / pageSize));
  const nextPage = () => setPage(Math.min(page + 1, maxPage));
  const prevPage = () => setPage(Math.max(page - 1, 0));
  const displayRows = getPage({ page, pageSize, rows: sortedRows });

  const setSortState = (s: SortState<C>) => {
    setPage(0);
    setSortState_(s);
  };

  return (
    <div className="grid gap-3">
      <div className="rounded-md border">
        <Table className={isTableFixed ? "table-fixed" : ""}>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columnOrder.map((col, ix) => {
                const column = columns[col]?.values;
                if (column === undefined) {
                  return "";
                }

                return (
                  <TableHead key={ix}>
                    <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium [&_svg]:size-4 [&_svg]:shrink-0">
                      {column.label}
                      {!column.sortFun ?
                        ""
                      : col !== sortState.column ?
                        <ArrowUpDown
                          className={"text-sm hover:text-slate-500 cursor-pointer"}
                          onClick={() => setSortState({ sorting: "increasing", column: col as string })}
                        />
                      : sortState.sorting === "increasing" ?
                        <ArrowDownNarrowWide
                          className={"text-slate-500 text-sm hover:text-slate-500 cursor-pointer"}
                          onClick={() => setSortState({ sorting: "decreasing", column: col as string })}
                        />
                      : <ArrowDownWideNarrow
                          className={"text-slate-500 text-sm hover:text-slate-500 cursor-pointer"}
                          onClick={() => setSortState({ sorting: "unsorted", column: null })}
                        />
                      }
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayRows.map((row, ix) => (
              <TableRow
                key={ix}
                className={cn(row.className, row.onClick ? "cursor-pointer hover:bg-muted/30" : "")}
                onClick={() => row.onClick?.(row.value)}
              >
                {columnOrder.map((col, colIx) => (
                  <TableCell key={colIx} className={isTableFixed ? ellipsis : ""}>
                    {row.contents[col]}
                  </TableCell>
                ))}
              </TableRow>
            ))}

            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columnOrder.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {hasPagination && (
        <div className="flex flex-cols justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {sortedRows.length} entries. Page {page} of {maxPage}
          </p>
          <div className="grid grid-cols-2 gap-1">
            <Button variant="outline" size="sm" onClick={prevPage} disabled={page === 0}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={nextPage} disabled={page === maxPage}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
