import * as React from "react";
import { Building2, CalendarDays, Check, ExternalLink, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ColumnDef, DataTable, type ColumnsConfig } from "@/components/ui/datatable";
import { cn } from "@/lib/utils";

export type ExampleId = "basic" | "rich" | "actions" | "selection" | "fixed" | "conditional";

type Status = "Active" | "Draft" | "Completed" | "Archived" | "Scheduled" | "Running" | "Failed";

const STATUS_STYLE: Record<Status, { dotClass: string; labelClass: string; chipClass: string }> = {
  Active: { dotClass: "bg-success", labelClass: "text-success", chipClass: "bg-success/10 text-success" },
  Draft: {
    dotClass: "bg-muted-foreground/60",
    labelClass: "text-muted-foreground",
    chipClass: "bg-muted text-muted-foreground",
  },
  Completed: {
    dotClass: "bg-destructive",
    labelClass: "text-destructive",
    chipClass: "bg-destructive/10 text-destructive",
  },
  Archived: {
    dotClass: "bg-muted-foreground/40",
    labelClass: "text-muted-foreground/80",
    chipClass: "bg-muted text-muted-foreground",
  },
  Scheduled: { dotClass: "bg-primary", labelClass: "text-primary", chipClass: "bg-primary/10 text-primary" },
  Running: { dotClass: "bg-success", labelClass: "text-success", chipClass: "bg-success/10 text-success" },
  Failed: {
    dotClass: "bg-destructive",
    labelClass: "text-destructive",
    chipClass: "bg-destructive/10 text-destructive",
  },
};

type Person = { id: number; name: string; role: string; age: number };

export function BasicExample({ people }: { people: Person[] }) {
  const [page, setPage] = React.useState(1);

  const columns = {
    name: new ColumnDef({ label: "Name", sortFun: (a: Person, b: Person) => a.name.localeCompare(b.name) }),
    role: new ColumnDef({ label: "Role", sortFun: null }),
    age: new ColumnDef({ label: "Age", sortFun: (a: Person, b: Person) => a.age - b.age }),
  } satisfies ColumnsConfig<Person>;

  return (
    <DataTable
      columns={columns}
      columnOrder={["name", "role", "age"]}
      pagination={{ page, setPage, pageSize: 10 }}
      emptyMessage="No people to show"
      rows={people.map(person => ({
        key: person.id,
        value: person,
        contents: {
          name: person.name,
          role: person.role,
          age: person.age,
        },
        onClick: row => window.alert(`Clicked ${row.name}`),
      }))}
    />
  );
}

type CampaignExample = {
  id: string;
  name: string;
  organization: string;
  status: Extract<Status, "Active" | "Draft" | "Completed" | "Archived">;
  activities: number;
};

export function RichCellsExample({ campaigns }: { campaigns: CampaignExample[] }) {
  const columns = {
    campaign: new ColumnDef({
      label: "Campaign",
      sortFun: (a: CampaignExample, b: CampaignExample) => a.name.localeCompare(b.name),
    }),
    organization: new ColumnDef({
      label: "Organization",
      sortFun: (a: CampaignExample, b: CampaignExample) => a.organization.localeCompare(b.organization),
    }),
    status: new ColumnDef({
      label: "Status",
      sortFun: (a: CampaignExample, b: CampaignExample) => a.status.localeCompare(b.status),
    }),
    activities: new ColumnDef({
      label: "Activities",
      sortFun: (a: CampaignExample, b: CampaignExample) => a.activities - b.activities,
    }),
  } satisfies ColumnsConfig<CampaignExample>;

  return (
    <DataTable
      columns={columns}
      columnOrder={["campaign", "organization", "status", "activities"]}
      emptyMessage="No campaigns"
      rows={campaigns.map(campaign => {
        const status = STATUS_STYLE[campaign.status];

        return {
          key: campaign.id,
          value: campaign,
          contents: {
            campaign: <span className="text-foreground font-medium">{campaign.name}</span>,
            organization: (
              <span className="text-muted-foreground inline-flex items-center gap-1.5">
                <Building2 className="size-3.5" />
                {campaign.organization}
              </span>
            ),
            status: (
              <span className="inline-flex items-center gap-1.5">
                <span className={cn("size-1.5 rounded-full", status.dotClass)} />
                <span className={cn(status.labelClass)}>{campaign.status}</span>
              </span>
            ),
            activities: <span className="text-muted-foreground tabular-nums">{campaign.activities}</span>,
          },
        };
      })}
    />
  );
}

type ProductExample = {
  id: string;
  name: string;
  supplier: string;
  status: Extract<Status, "Active" | "Draft" | "Archived">;
  url: string | null;
};

export function ActionsExample({ products }: { products: ProductExample[] }) {
  const [lastAction, setLastAction] = React.useState("No action yet.");

  const columns = {
    product: new ColumnDef({
      label: "Product",
      sortFun: (a: ProductExample, b: ProductExample) => a.name.localeCompare(b.name),
    }),
    supplier: new ColumnDef({
      label: "Supplier",
      sortFun: (a: ProductExample, b: ProductExample) => a.supplier.localeCompare(b.supplier),
    }),
    status: new ColumnDef({ label: "Status", sortFun: null }),
    url: new ColumnDef({ label: "URL", sortFun: null }),
    actions: new ColumnDef({ label: "", sortFun: null }),
  } satisfies ColumnsConfig<ProductExample>;

  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-sm">{lastAction}</p>
      <DataTable
        columns={columns}
        columnOrder={["product", "supplier", "status", "url", "actions"]}
        emptyMessage="No products"
        rows={products.map(product => ({
          key: product.id,
          value: product,
          onClick: row => setLastAction(`Opened ${row.name}`),
          contents: {
            product: <span className="text-foreground font-medium">{product.name}</span>,
            supplier: <span className="text-muted-foreground">{product.supplier}</span>,
            status: <StatusChip status={product.status} />,
            url:
              product.url ?
                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={event => event.stopPropagation()}
                  className="text-muted-foreground hover:text-primary inline-flex max-w-64 items-center gap-1"
                >
                  <ExternalLink className="size-3.5 shrink-0" />
                  <span className="truncate">{product.url}</span>
                </a>
              : <span className="text-muted-foreground/60 italic">no URL</span>,
            actions: (
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={event => {
                  event.stopPropagation();
                  setLastAction(`Edited ${product.name}`);
                }}
                aria-label={`Edit ${product.name}`}
              >
                <Pencil className="size-4" />
              </Button>
            ),
          },
        }))}
      />
    </div>
  );
}

type TemplateExample = {
  id: string;
  name: string;
  status: Extract<Status, "Active" | "Draft" | "Archived">;
  description: string;
};

export function SelectionExample({ templates }: { templates: TemplateExample[] }) {
  const [selectedId, setSelectedId] = React.useState(templates[0]?.id ?? "");

  const columns = {
    radio: new ColumnDef({ label: "", sortFun: null }),
    name: new ColumnDef({
      label: "Template",
      sortFun: (a: TemplateExample, b: TemplateExample) => a.name.localeCompare(b.name),
    }),
    status: new ColumnDef({ label: "Status", sortFun: null }),
    description: new ColumnDef({ label: "Description", sortFun: null }),
  } satisfies ColumnsConfig<TemplateExample>;

  return (
    <DataTable
      columns={columns}
      columnOrder={["radio", "name", "status", "description"]}
      emptyMessage="No templates"
      rows={templates.map(template => {
        const selected = selectedId === template.id;

        return {
          key: template.id,
          value: template,
          onClick: row => setSelectedId(row.id),
          className: cn(selected && "bg-primary/5 hover:bg-primary/5"),
          contents: {
            radio: <SelectionRadio selected={selected} />,
            name: <span className="text-foreground font-medium">{template.name}</span>,
            status: <StatusChip status={template.status} />,
            description: <span className="text-muted-foreground">{template.description}</span>,
          },
        };
      })}
    />
  );
}

type ActivityExample = {
  id: string;
  activity: string;
  dateMs: number;
  dateLabel: string;
  owner: string;
  status: Extract<Status, "Scheduled" | "Completed" | "Draft">;
};

export function DefaultSortFixedExample({ activities }: { activities: ActivityExample[] }) {
  const columns = {
    activity: new ColumnDef({
      label: "Activity",
      sortFun: (a: ActivityExample, b: ActivityExample) => a.activity.localeCompare(b.activity),
    }),
    date: new ColumnDef({
      label: "Date",
      sortFun: (a: ActivityExample, b: ActivityExample) => a.dateMs - b.dateMs,
    }),
    owner: new ColumnDef({
      label: "Owner",
      sortFun: (a: ActivityExample, b: ActivityExample) => a.owner.localeCompare(b.owner),
    }),
    status: new ColumnDef({ label: "Status", sortFun: null }),
  } satisfies ColumnsConfig<ActivityExample>;

  return (
    <DataTable
      columns={columns}
      columnOrder={["activity", "date", "owner", "status"]}
      defaultSort={{ sorting: "decreasing", column: "date" }}
      isTableFixed
      emptyMessage="No activities"
      rows={activities.map(activity => ({
        key: activity.id,
        value: activity,
        contents: {
          activity: (
            <span className="text-foreground font-medium" title={activity.activity}>
              {activity.activity}
            </span>
          ),
          date: (
            <span className="text-muted-foreground inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5" />
              {activity.dateLabel}
            </span>
          ),
          owner: activity.owner,
          status: <StatusChip status={activity.status} />,
        },
      }))}
    />
  );
}

type JobExample = {
  id: string;
  legacyType: string;
  status: Extract<Status, "Running" | "Completed" | "Failed">;
  created: string;
};

export function ConditionalColumnsExample({ jobs }: { jobs: JobExample[] }) {
  const [showLegacyType, setShowLegacyType] = React.useState(true);
  const [selectedJobId, setSelectedJobId] = React.useState(jobs[0]?.id ?? "");

  const columns = {
    job: new ColumnDef({ label: "Job", sortFun: null }),
    legacyType: new ColumnDef({ label: "Type", sortFun: null }),
    status: new ColumnDef({ label: "Status", sortFun: null }),
    created: new ColumnDef({ label: "Created", sortFun: null }),
  } satisfies ColumnsConfig<JobExample>;

  const columnOrder: (keyof typeof columns)[] =
    showLegacyType ? ["job", "legacyType", "status", "created"] : ["job", "status", "created"];

  return (
    <div className="grid gap-3">
      <div>
        <Button variant="outline" size="sm" onClick={() => setShowLegacyType(show => !show)}>
          {showLegacyType ? "Hide type column" : "Show type column"}
        </Button>
      </div>

      <DataTable
        columns={columns}
        columnOrder={columnOrder}
        emptyMessage="No jobs"
        rows={jobs.map(job => ({
          key: job.id,
          value: job,
          className: cn(selectedJobId === job.id && "bg-muted"),
          onClick: row => setSelectedJobId(row.id),
          contents: {
            job: <span className="font-mono">{job.id.slice(0, 8)}...</span>,
            legacyType: job.legacyType,
            status: <StatusChip status={job.status} />,
            created: job.created,
          },
        }))}
      />
    </div>
  );
}

function SelectionRadio({ selected }: { selected: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "border-muted-foreground/40 inline-flex size-4 items-center justify-center rounded-full border",
        selected && "border-primary",
      )}
    >
      {selected && <span className="bg-primary size-2 rounded-full" />}
    </span>
  );
}

function StatusChip({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium",
        STATUS_STYLE[status].chipClass,
      )}
    >
      {status === "Completed" && <Check className="size-3" />}
      {status}
    </span>
  );
}
