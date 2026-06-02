/**
 * Trimmed reference excerpt — the form + write flow, end-to-end.
 *
 * Source: app/frontend/src/pages/org/campaigns.tsx (ambar/HartAgency).
 * Shows: useForm({ fields, validate }) with TextInput/TextareaInput/ComboboxInput/DateInput ->
 * RemoteData submit cell -> call(api.createCampaign, body).fork -> schedule() on success ->
 * boundary conversions (trim, dateOnlyToPosix, new Id<Org>). The companion data fetch loads the
 * combobox items via call(api.listOrgs).fork.
 *
 * Trimmed from the original (~679 lines): the create-campaign dialog originally runs as a 3-step
 * wizard (details -> context -> review) — collapsed here to a single form so the pattern is
 * legible. The useForm config, validate, handleCreate, the data fetch, and the helpers are
 * verbatim. Omitted: the wizard stepper, review screen, success-screen chrome, the
 * linked-products picker, and the list/pagination view. Not wired to compile standalone.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { FormInput, TextInput, TextareaInput, DateInput, ComboboxInput, useForm } from "@fe/components/ui/forms";
import {
  api,
  type CreateCampaignResponse,
  type ListOrgsResponse,
} from "@fe/api/endpoints";
import { call } from "@fe/api/request";
import { fetchErrorToString } from "@fe/lib/request";
import { useProjectionDelay } from "@fe/hooks/use-projection-delay";
import { RemoteData, NotAsked, Loading, Failed, Ready } from "@ambarltd/core/remote-data";
import { DateOnly, POSIX, TimeOfDay } from "@ambarltd/core/time";
import { Id } from "@be/lib/eventSourcing/event";
import { type Org } from "@be/domain/org/aggregate/org";
import { type RichText } from "@be/app/types";

type CampaignSubmitDone = { name: string };

const REFERENCEABLE_TYPES: ("Supplier" | "Distributor")[] = ["Supplier", "Distributor"];

function CreateCampaignForm({
  orgId,
  existingNames,
  onCreated,
}: {
  orgId: Id<Org>;
  existingNames: string[];
  onCreated: () => void;
}) {
  const [submit, setSubmit] = useState<RemoteData<string, CampaignSubmitDone>>(NotAsked());
  const submittingRef = useRef(false);
  const { schedule } = useProjectionDelay();

  // Load the combobox items — same fork shape, into their own RemoteData cells.
  const [orgs, setOrgs] = useState<RemoteData<string, ListOrgsResponse>>(Loading());
  useEffect(() => {
    call(api.listOrgs, { types: REFERENCEABLE_TYPES }).fork(
      err => setOrgs(Failed(fetchErrorToString(err))),
      r => setOrgs(Ready(r)),
    );
  }, []);

  const supplierItems = useMemo(() => (orgs.isReady ? orgs.value.orgs.filter(o => o.type === "Supplier") : []), [orgs]);
  const distributorItems = useMemo(
    () => (orgs.isReady ? orgs.value.orgs.filter(o => o.type === "Distributor") : []),
    [orgs],
  );

  const { fields, onSubmit } = useForm({
    fields: {
      name: new TextInput({
        label: "Name",
        type: "text",
        defaultValue: "",
        placeholder: "e.g. Spring Product Launch",
      }),
      description: new TextareaInput({
        label: "Description",
        defaultValue: "",
        placeholder: "Briefly describe the campaign…",
        rows: 3,
      }),
      supplierOrgId: new ComboboxInput<ListOrgsResponse["orgs"][number]>({
        label: "Supplier",
        items: supplierItems,
        defaultValue: null,
        getValue: o => o.orgId.value,
        getKey: o => o.orgId.value,
        getLabel: o => o.name,
        itemToString: o => o.name,
        placeholder: "Select a supplier (optional)",
        emptyMessage: "No suppliers available.",
        allowClear: true,
      }),
      distributorOrgId: new ComboboxInput<ListOrgsResponse["orgs"][number]>({
        label: "Distributor",
        items: distributorItems,
        defaultValue: null,
        getValue: o => o.orgId.value,
        getKey: o => o.orgId.value,
        getLabel: o => o.name,
        itemToString: o => o.name,
        placeholder: "Select a distributor (optional)",
        emptyMessage: "No distributors available.",
        allowClear: true,
      }),
      startDate: new DateInput({ label: "Start date", defaultValue: null }),
      endDate: new DateInput({ label: "End date", defaultValue: null }),
    },
    // validate returns the SAME keys as `fields`; each is `string | null` (null = valid).
    validate: values => ({
      name:
        values.name.trim() === "" ? "Name is required."
        : existingNames.includes(values.name.trim().toLowerCase()) ? "Name already in use."
        : null,
      description: null,
      supplierOrgId: null,
      distributorOrgId: null,
      startDate: null,
      endDate: validateEndAfterStart(values.startDate, values.endDate),
    }),
  });

  const handleCreate = onSubmit(values => {
    if (submittingRef.current || submit.isLoading) return;
    submittingRef.current = true;
    setSubmit(Loading());
    const description: RichText = { format: "Text", content: values.description };
    call(api.createCampaign, {
      orgId,
      name: values.name.trim(),
      description,
      startDate: values.startDate == null ? null : POSIX.fromLocalDateAndTime(values.startDate, UTC_MIDNIGHT, "UTC"),
      endDate: values.endDate == null ? null : POSIX.fromLocalDateAndTime(values.endDate, UTC_MIDNIGHT, "UTC"),
      supplierOrgId: values.supplierOrgId ? new Id<Org>(values.supplierOrgId) : null,
      distributorOrgId: values.distributorOrgId ? new Id<Org>(values.distributorOrgId) : null,
    }).fork(
      err => {
        submittingRef.current = false;
        setSubmit(Failed(fetchErrorToString(err)));
      },
      // Success on commit; read models lag — defer the read-dependent state flip via schedule().
      (_r: CreateCampaignResponse) => {
        schedule(() => setSubmit(Ready({ name: values.name.trim() })));
      },
    );
  });

  if (submit.isReady) {
    return <CampaignSuccessScreen name={submit.value.name} onDone={onCreated} />;
  }

  return (
    <form onSubmit={e => { e.preventDefault(); void handleCreate(); }} className="space-y-4">
      <FormInput config={fields.name} disabled={submit.isLoading} />
      <FormInput config={fields.description} disabled={submit.isLoading} />
      <FormInput config={fields.supplierOrgId} disabled={submit.isLoading} />
      <FormInput config={fields.distributorOrgId} disabled={submit.isLoading} />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormInput config={fields.startDate} disabled={submit.isLoading} />
        <FormInput config={fields.endDate} disabled={submit.isLoading} />
      </div>
      {submit.isFailed && <p className="text-destructive text-sm">{submit.failure}</p>}
      <button type="submit" disabled={submit.isLoading}>
        {submit.isLoading ? "Creating…" : "Create Campaign"}
      </button>
    </form>
  );
}

// Boundary helpers (verbatim from source) ----------------------------------
function validateEndAfterStart(start: DateOnly | null, end: DateOnly | null): string | null {
  if (!start || !end) return null;
  return end.compare(start) < 0 ? "End date must be on or after start date." : null;
}
