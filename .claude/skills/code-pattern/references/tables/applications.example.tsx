/**
 * Trimmed reference excerpt — the DataTable end-to-end pattern.
 *
 * Source: frontend/src/pages/super_admin/applications.tsx (ambar/ashraf).
 * Shows: fetch (Future) -> RemoteData match -> ColumnsConfig -> rows = data.map -> <DataTable>.
 * Omitted from the original: the detail drawer, review/approve/reject actions, message
 * composer, dialogs, status KPI cards, files view, and history sections.
 * Read it for shape — it is not wired to compile standalone. The abstraction it uses lives
 * in ./datatable.tsx (built on ./table.tsx).
 */

import * as api from "@/ambar/api/endpoints";

import * as React from "react";
import {
  CooperativeApplication,
  ApplicationStatus,
  SuperSessionToken,
  Email,
  IdCooperativeApplication,
} from "@/ambar/api/types";
import { NotAsked, Loading, Failed, Ready } from "@ambarltd/core/remote-data";
import { Future } from "@ambarltd/core/future";
import { SuperSession } from "@/app/session";
import { DataTable, ColumnDef, ColumnsConfig } from "@/components/ui/datatable";

type AdministratorDetails = {
  first_name: string;
  last_name: string;
  email: Email;
};

type ApplicationDetails = {
  application: CooperativeApplication;
  applicant: AdministratorDetails;
};

// Fetchers return a Future; the page forks it into RemoteData state.
function fetchCooperatives(
  session_token: SuperSessionToken,
): Future<api.RequestError, ApplicationDetails[]> {
  return api
    .cooperative__registration__query__all_application_ids({ session_token })
    .chain(({ application_ids }) =>
      Future.mapConcurrently(
        (application_id) => fetchApplicationDetails(session_token, application_id),
        application_ids,
      ),
    );
}

function fetchApplicationDetails(
  session_token: SuperSessionToken,
  application_id: IdCooperativeApplication,
): Future<api.RequestError, ApplicationDetails> {
  return api
    .cooperative__registration__query__application_details({ session_token, application_id })
    .chain((application) =>
      api
        .administration__administration__query__details_by_id({
          session_token,
          administrator_id: application.applicant_id,
        })
        .map((applicant): ApplicationDetails => ({ application, applicant })),
    );
}

// 1-3. Fetch into a RemoteData cell, then match the four cases with instanceof.
function SuperApplications({ session }: { session: SuperSession }): React.ReactNode {
  const [state, setState] = React.useState<api.Remote<ApplicationDetails[]>>(NotAsked());

  React.useEffect(() => {
    setState(Loading());
    return fetchCooperatives(session.session_token).fork(
      (e) => setState(Failed(e)),
      (v) => setState(Ready(v)),
    );
  }, [session.session_token]);

  return state instanceof Ready ? (
    <ApplicationsTable data={state.value} />
  ) : state instanceof Loading ? (
    <div>Loading...</div>
  ) : state instanceof Failed ? (
    <div>{api.requestErrorToString(state.failure)}</div>
  ) : state instanceof NotAsked ? (
    <>Stuck?</>
  ) : (
    (state satisfies never)
  );
}

// Row-interaction state machine — kept in the child (see ../component-boundaries.md).
type DrawerProps =
  | { state: "Closed" }
  | { state: "Open"; application: ApplicationDetails }
  | { state: "Closing"; application: ApplicationDetails };

// 4. Hold page state, define columns, map data to rows.
function ApplicationsTable({ data }: { data: ApplicationDetails[] }): React.ReactNode {
  const [page, setPage] = React.useState<number>(0);
  const [drawer, setDrawer] = React.useState<DrawerProps>({ state: "Closed" });

  const columns: ColumnsConfig<ApplicationDetails> = {
    name: new ColumnDef({
      label: "Cooperative Name",
      sortFun: (a, b) => a.application.name.localeCompare(b.application.name),
    }),
    tax_identification_number: new ColumnDef({
      label: "Tax Identification Number",
      sortFun: null, // null = not sortable
    }),
    registered_at: new ColumnDef({
      label: "Registered At",
      sortFun: (a, b) => {
        // registered_at is Maybe<UTC>: map -> withDefault yields a comparable number.
        const at = a.application.registered_at.map((utc) => utc.toMillis()).withDefault(0);
        const bt = b.application.registered_at.map((utc) => utc.toMillis()).withDefault(0);
        return at - bt;
      },
    }),
    status: new ColumnDef({
      label: "Status",
      sortFun: (a, b) => a.application.status.localeCompare(b.application.status),
    }),
  };

  const handleRowClick = React.useCallback((rowData: ApplicationDetails) => {
    setDrawer({ state: "Open", application: rowData });
  }, []);

  return (
    <>
      <DataTable
        columns={columns}
        columnOrder={["name", "tax_identification_number", "registered_at", "status"]}
        pagination={{ page, setPage, pageSize: 8 }}
        emptyMessage="No applications available"
        rows={data.map((applicationDetails) => ({
          value: applicationDetails,
          contents: {
            name: applicationDetails.application.name,
            tax_identification_number: applicationDetails.application.tax_identification_number,
            registered_at: applicationDetails.application.registered_at
              .map((utc) => utc.formatDateLocal())
              .withDefault("-"),
            status: getStatusConfig(applicationDetails.application.status).label,
          },
          onClick: handleRowClick,
        }))}
      />
      {/* Row click opened the drawer; the detail panel is omitted from this excerpt. */}
      {drawer.state === "Open" && (
        <DetailDrawer
          application={drawer.application}
          onClose={() => setDrawer({ state: "Closed" })}
        />
      )}
    </>
  );
}

// Typed presentation helper — drives the status cell's label/color (see ../component-boundaries.md).
const getStatusConfig = (status: ApplicationStatus) => {
  switch (status) {
    case "Approved":
      return { label: "Approved", color: "#10B981" };
    case "PendingReview":
      return { label: "Pending", color: "#FACC15" };
    case "NotReadyForReview":
      return { label: "Not Ready for Review", color: "#F87171" };
    default:
      return status satisfies never;
  }
};

export default SuperApplications;
