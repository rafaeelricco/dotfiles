/**
 * Worked example — the page pattern, end-to-end.
 *
 * Source: frontend/src/pages/super_admin/cooperatives.tsx (ambar/ashraf), copied near-verbatim
 * (the RemoteData match is reordered to the canonical Ready -> Loading -> Failed -> NotAsked
 * sequence from page-pattern.md, so the example doesn't contradict the guide).
 * Demonstrates: layout-shell wrapper -> a RemoteData cell fed by a Future.fork in useEffect
 * -> exhaustive `instanceof ... satisfies never` match -> container/presentational split
 * (SuperCooperatives -> Content -> CooperativesTable) -> a composed Future data layer
 * (Future.concurrently for independent calls, Future.mapConcurrently to fan out over a list,
 * .chain for a dependent call, .map to project the field).
 */

export default SuperAdminCooperatives;

import * as React from "react";

import {
  api,
  type ListCooperativesResponse,
  type LoansByCooperativeResponse,
  type MembersByCooperativeResponse,
  type TiersByCooperativeResponse,
} from "@fe/api/endpoints";
import { call } from "@fe/api/request";
import { fetchErrorToString, type FetchErrorResponse } from "@fe/lib/request";
import { Money } from "@be/lib/money";
import { SuperSession } from "@/app/session";
import { RemoteData, NotAsked, Failed, Ready, Loading } from "@ambarltd/core/remote-data";
import { Future } from "@ambarltd/core/future";
import { Just } from "@ambarltd/core/maybe";
import { AlertFailure, AlertLoading } from "@/components/ui/alert";
import { SuperSidebarItem, SuperSidebarLayout } from "@/components/super_admin/sidebar-layout";
import { ColumnDef, ColumnsConfig, DataTable } from "@/components/ui/datatable";
import { Link } from "@/routes";

type CooperativeDetails = {
  cooperative: ListCooperativesResponse["cooperatives"][number];
  loans: Money;
  members: MembersByCooperativeResponse["members"][number][];
  tiers: TiersByCooperativeResponse["tiers"][number][];
};

function SuperAdminCooperatives({ session }: { session: SuperSession }) {
  const [state, setState] = React.useState<RemoteData<FetchErrorResponse, CooperativeDetails[]>>(NotAsked());

  React.useEffect(() => {
    setState(Loading());
    return fetchCooperatives().fork(
      e => setState(Failed(e)),
      v => setState(Ready(v)),
    );
  }, []);

  return (
    <SuperSidebarLayout
      breadcrumbs={{ path: [], current: "Cooperatives" }}
      session={session}
      selected={Just(SuperSidebarItem.Cooperatives)}
    >
      {state instanceof Ready ?
        <Content state={state.value} />
      : state instanceof Loading ?
        <AlertLoading>Loading…</AlertLoading>
      : state instanceof Failed ?
        <AlertFailure>{fetchErrorToString(state.failure)}</AlertFailure>
      : state instanceof NotAsked ?
        <>Stuck?</>
      : (state satisfies never)}
    </SuperSidebarLayout>
  );
}

function Content({ state }: { state: CooperativeDetails[] }) {
  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 id="main-heading" className="text-zinc-950 text-xl font-semibold">
            Cooperatives
          </h3>
          <p className="text-sm text-muted-foreground">Overview of all approved cooperatives.</p>
        </div>
      </div>
      <CooperativesTable data={state} />
    </div>
  );
}

function CooperativesTable({ data }: { data: CooperativeDetails[] }) {
  const [page, setPage] = React.useState<number>(0);

  const columns: ColumnsConfig<CooperativeDetails> = {
    name: new ColumnDef({
      label: "Name",
      sortFun: null,
    }),
    loans: new ColumnDef({
      label: "Loans",
      sortFun: null,
    }),
    members: new ColumnDef({
      label: "Members",
      sortFun: null,
    }),
    tiers: new ColumnDef({
      label: "Tiers",
      sortFun: null,
    }),
    actions: new ColumnDef({
      label: "",
      sortFun: null,
    }),
  };

  return (
    <DataTable
      columns={columns}
      pagination={{ page, setPage, pageSize: 8 }}
      emptyMessage="No cooperatives or applications available"
      columnOrder={["name", "loans", "members", "tiers", "actions"]}
      rows={data.map(cooperativeDetails => ({
        value: cooperativeDetails,
        className: "[&>td]:overflow-hidden [&>td]:text-ellipsis [&>td]:whitespace-nowrap rich-text",
        contents: {
          name: cooperativeDetails.cooperative.name,
          loans: cooperativeDetails.loans.pretty(),
          members: cooperativeDetails.members.length,
          tiers: cooperativeDetails.tiers.length,
          actions: (
            <Link
              to="/super/cooperatives/:cooperativeId"
              className="text-blue-600 hover:underline"
              params={{ cooperativeId: cooperativeDetails.cooperative.cooperativeId.value }}
            >
              View
            </Link>
          ),
        },
      }))}
    />
  );
}

function fetchLoansByCooperativeId(
  cooperativeId: ListCooperativesResponse["cooperatives"][number]["cooperativeId"],
): Future<FetchErrorResponse, LoansByCooperativeResponse["loans"][number][]> {
  return call(api.loansByCooperativeId, { cooperativeId }).map(result => result.loans);
}

function fetchMembersByCooperativeId(
  cooperativeId: ListCooperativesResponse["cooperatives"][number]["cooperativeId"],
): Future<FetchErrorResponse, MembersByCooperativeResponse["members"][number][]> {
  return call(api.membersByCooperativeId, { cooperativeId }).map(result => result.members);
}

function fetchTiersByCooperativeId(
  cooperativeId: ListCooperativesResponse["cooperatives"][number]["cooperativeId"],
): Future<FetchErrorResponse, TiersByCooperativeResponse["tiers"][number][]> {
  return call(api.tiersByCooperativeId, { cooperativeId }).map(result => result.tiers);
}

function fetchCooperatives(): Future<FetchErrorResponse, CooperativeDetails[]> {
  return call(api.listCooperatives, {}).chain(result =>
    Future.mapConcurrently(cooperative => fetchCooperativeDetails(cooperative), result.cooperatives),
  );
}

function calculateTotalLoans(loans: LoansByCooperativeResponse["loans"][number][]): Money {
  return loans.reduce((total, loan) => total.add(loan.details.borrowed_amount), new Money(0, "MYR"));
}

function fetchCooperativeDetails(
  cooperative: ListCooperativesResponse["cooperatives"][number],
): Future<FetchErrorResponse, CooperativeDetails> {
  return Future.concurrently<
    FetchErrorResponse,
    {
      loans: LoansByCooperativeResponse["loans"][number][];
      members: MembersByCooperativeResponse["members"][number][];
      tiers: TiersByCooperativeResponse["tiers"][number][];
    }
  >({
    loans: fetchLoansByCooperativeId(cooperative.cooperativeId),
    members: fetchMembersByCooperativeId(cooperative.cooperativeId),
    tiers: fetchTiersByCooperativeId(cooperative.cooperativeId),
  }).map(({ loans, members, tiers }) => ({
    cooperative,
    loans: calculateTotalLoans(loans),
    members,
    tiers,
  }));
}
