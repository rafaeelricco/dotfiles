/**
 * Worked example — the page pattern, end-to-end.
 *
 * Source: frontend/src/pages/super_admin/cooperatives.tsx (ambar/ashraf), copied near-verbatim
 * (the RemoteData match is reordered to the canonical Ready -> Loading -> Failed -> NotAsked
 * sequence from pages.md, so the example doesn't contradict the guide).
 * Demonstrates: layout-shell wrapper -> a RemoteData cell fed by a Future.fork in useEffect
 * -> exhaustive `instanceof ... satisfies never` match -> container/presentational split
 * (SuperCooperatives -> Content -> CooperativesTable) -> a composed Future data layer
 * (Future.concurrently for independent calls, Future.mapConcurrently to fan out over a list,
 * .chain for a dependent call, .map to project the field).
 */

export default SuperCooperatives;

import * as api from "@/ambar/api/endpoints";
import * as React from "react";

import { Cooperative, SuperSessionToken, IdCooperative, LoanInfo, Money, Member, Tier } from "@/ambar/api/types";
import { SuperSession } from "@/app/session";
import { NotAsked, Failed, Ready, Loading } from "@ambarltd/core/remote-data";
import { Future } from "@ambarltd/core/future";
import { Just } from "@ambarltd/core/maybe";
import { AlertFailure, AlertLoading } from "@/components/ui/alert";
import { SuperSidebarItem, SuperSidebarLayout } from "@/components/super_admin/sidebar-layout";
import { ColumnDef, ColumnsConfig, DataTable } from "@/components/ui/datatable";
import { Link } from "@/routes";

function SuperCooperatives({ session }: { session: SuperSession }) {
  const [state, setState] = React.useState<api.Remote<CooperativeDetails[]>>(NotAsked());

  React.useEffect(() => {
    setState(Loading());
    return fetchCooperatives(session.session_token).fork(
      (e) => setState(Failed(e)),
      (v) => setState(Ready(v))
    );
  }, [session.session_token]);

  return (
    <SuperSidebarLayout
      breadcrumbs={{ path: [], current: "Cooperatives" }}
      session={session}
      selected={Just(SuperSidebarItem.Cooperatives)}
    >
      {state instanceof Ready ? (
        <Content state={state.value} />
      ) : state instanceof Loading ? (
        <AlertLoading>Loading…</AlertLoading>
      ) : state instanceof Failed ? (
        <AlertFailure>{api.requestErrorToString(state.failure)}</AlertFailure>
      ) : state instanceof NotAsked ? (
        <>Stuck?</>
      ) : (
        (state satisfies never)
      )}
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
      rows={data.map((cooperativeDetails) => ({
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
              params={{ cooperativeId: cooperativeDetails.cooperative.cooperative_id }}
            >
              View
            </Link>
          ),
        },
      }))}
    />
  );
}

type CooperativeDetails = {
  cooperative: Cooperative;
  loans: Money;
  members: Member[];
  tiers: Tier[];
};

function fetchLoansByCooperativeId(
  session_token: SuperSessionToken,
  cooperative_id: IdCooperative
): Future<api.RequestError, LoanInfo[]> {
  return api
    .cooperative__loan__query__loans_by_cooperative_id({ session_token, cooperative_id })
    .map((result) => result.loans);
}

function fetchMembersByCooperativeId(
  session_token: SuperSessionToken,
  cooperative_id: IdCooperative
): Future<api.RequestError, Member[]> {
  return api
    .cooperative__member__query__members_by_cooperative_id({ session_token, cooperative_id })
    .map((result) => result.members);
}

function fetchTiersByCooperativeId(
  session_token: SuperSessionToken,
  cooperative_id: IdCooperative
): Future<api.RequestError, Tier[]> {
  return api
    .cooperative__tier__query__tiers_by_cooperative_id({ session_token, cooperative_id })
    .map((result) => result.tiers);
}

function fetchCooperatives(session_token: SuperSessionToken): Future<api.RequestError, CooperativeDetails[]> {
  return api
    .cooperative__cooperative__query__all({ session_token })
    .chain((result) =>
      Future.mapConcurrently((cooperative) => fetchCooperativeDetails(session_token, cooperative), result.cooperatives)
    );
}

function calculateTotalLoans(loans: LoanInfo[]): Money {
  return loans.reduce(
    (total, loan) => total.add(loan.details.borrowed_amount),
    new Money(0, "MYR")
  );
}

function fetchCooperativeDetails(
  session_token: SuperSessionToken,
  cooperative: Cooperative
): Future<api.RequestError, CooperativeDetails> {
  return Future.concurrently<api.RequestError, { loans: LoanInfo[]; members: Member[]; tiers: Tier[] }>({
    loans: fetchLoansByCooperativeId(session_token, cooperative.cooperative_id),
    members: fetchMembersByCooperativeId(session_token, cooperative.cooperative_id),
    tiers: fetchTiersByCooperativeId(session_token, cooperative.cooperative_id),
  }).map(({ loans, members, tiers }) => ({
    cooperative,
    loans: calculateTotalLoans(loans),
    members,
    tiers,
  }));
}
