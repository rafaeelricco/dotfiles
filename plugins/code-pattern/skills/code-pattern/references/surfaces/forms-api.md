# Forms and API integration

Every frontend write follows one recipe: pick a typed `api.*` entry, fire it with **`call(endpoint,
body)`** (which returns a lazy **`Future`**), and handle the outcome with **`.fork(onError,
onSuccess)`** at the boundary. Build the inputs with the package-local **`useForm`** abstraction —
**config classes** for `fields`, a `validate` keyed to those fields, and `<FormInput>` to render
each one. Model submit state as a **`RemoteData`** cell, and on the success path defer any
read-model-dependent work through **`useProjectionDelay`'s `schedule()`**. Examples are copied from
`app/frontend`; substitute your own endpoints and domain types.

Bundled reference (from a production codebase — `app/frontend`):

- `../examples/forms-api/forms.example.tsx` — the form abstraction: `useForm`, `FormInput`, and the field config classes
  (`TextInput`, `TextareaInput`, `DateInput`, `ComboboxInput`, …). **Trimmed** to the public API —
  the per-field render components and internal state plumbing are omitted (noted in its header).
- `../examples/forms-api/endpoints.example.tsx` — the endpoint registry: the `api` object mapping friendly names to typed
  `PlainEndpoint` descriptors, plus response-type re-exports. Adapted from `src/api/endpoints.ts`.
- `../examples/forms-api/request.example.tsx` — the HTTP layer: `call`, `query`, `uploadMultipart`, `stream` (each returns a
  `Future<FetchErrorResponse, Res>`). Verbatim.
- `../examples/forms-api/use-projection-delay.example.tsx` — `useProjectionDelay()` → `{ schedule, cancel }`, the read-after-write
  delay. Verbatim.
- `../examples/forms-api/campaigns.example.tsx` — a worked write flow (create-campaign): `useForm` config + `validate` →
  `RemoteData` submit cell → `call(...).fork` → `schedule()` on success. Trimmed excerpt.

For the page shell that hosts a form, see `./pages.md`; for rendering the data a write
mutates, `./tables.md`.

## Table of contents

- [Audit](#audit)
- [Canonical references](#canonical-references-by-role)
- [Imports](#imports)
- [1. Calling the backend](#1-calling-the-backend)
- [2. The form](#2-the-form-useform)
- [3. Submit state](#3-submit-state-remotedata)
- [4. Read-after-write](#4-read-after-write-useprojectiondelay)
- [5. Boundary conversions](#5-boundary-conversions)
- [Surface variants](#surface-variants)
- [Cross-references](#cross-references)
- [Do / Do not](#do--do-not)

## Audit

- Inspect the nearest `package.json` and the local aliases (`@fe/*` in frontend; `@/*` in mobile).
- Find `src/api/endpoints.ts` (the `api` object), `src/api/request.ts` (`call`/`query`/…),
  `src/components/ui/forms.tsx` (`useForm`/`FormInput`), and the read-after-write helper
  (`src/hooks/use-projection-delay.ts`).
- Read one or two nearby write flows before editing — match their import surface and fork shape.

Report the audit briefly:

```md
Forms and API Integration Audit:

- Package surface:
- Endpoints module (api object):
- Request helper (call/query/uploadMultipart):
- Form abstraction (useForm/FormInput):
- Read-after-write mechanism:
- Nearby write/read flows:
- Boundary decisions needed:
```

## Canonical references (by role)

- **`@fe/api/endpoints`** — the `api` object; entries mirror `backend.command.*` / `backend.query.*`,
  plus response type re-exports (e.g. `type CreateCampaignResponse`).
- **`@fe/api/request`** — `call(endpoint, body)`, `query(Query)`, `uploadMultipart(endpoint,
FormData)`, `stream(...)`. Each returns a `Future`.
- **`@fe/components/ui/forms`** — `useForm`, `FormInput`, and config classes (`TextInput`,
  `TextareaInput`, `DateInput`, `TimeInput`, `CheckboxInput`, `ComboboxInput`, `SelectInput`,
  `TagsInput`).
- **`@fe/hooks/use-projection-delay`** — `useProjectionDelay()` → `{ schedule, cancel }`.
- **`@fe/lib/request`** — `fetchErrorToString` (transport error → string).

> The `@fe/*` alias is frontend-specific; mobile packages use `@/*` and may export a different field
> set. Follow the package's existing import surface.

## Imports

    import { FormInput, TextInput, TextareaInput, DateInput, ComboboxInput, useForm } from "@fe/components/ui/forms";
    import { api, type CreateCampaignResponse } from "@fe/api/endpoints";
    import { call } from "@fe/api/request";
    import { fetchErrorToString } from "@fe/lib/request";
    import { useProjectionDelay } from "@fe/hooks/use-projection-delay";
    import { RemoteData, NotAsked, Loading, Failed, Ready } from "@ambarltd/core/remote-data";

## 1. Calling the backend

Use the typed `api.*` entries; never hand-roll `fetch` for a domain command/query. `call` returns a
lazy `Future` — nothing runs until `.fork`:

    call(api.createCampaign, body).fork(
      (err) => setSubmit(Failed(fetchErrorToString(err))),
      (res) => { /* success */ },
    );

- `.chain` sequences dependent writes; `Future.parallel` / `Future.concurrently` run independent
  ones. (`Future` vocabulary: `./pages.md` §3.)
- File uploads use `uploadMultipart(endpoint, formData)` — do **not** set `Content-Type` (the
  browser adds the multipart boundary). Read side uses `query(new Query({...}))`.

## 2. The form (`useForm`)

Define `fields` with **config classes** and a `validate` returning a per-field `string | null` map
**keyed exactly to `fields`** (`null` = no error). `useForm` returns `{ fields, onSubmit }`:

    const { fields, onSubmit } = useForm({
      fields: {
        name: new TextInput({ label: "Name", type: "text", defaultValue: "", placeholder: "…" }),
        description: new TextareaInput({ label: "Description", defaultValue: "", rows: 3 }),
        supplierOrgId: new ComboboxInput<Org>({
          label: "Supplier", items: supplierItems, defaultValue: null,
          getValue: (o) => o.orgId.value, getLabel: (o) => o.name, allowClear: true,
        }),
        startDate: new DateInput({ label: "Start date", defaultValue: null }),
      },
      validate: (values) => ({
        name: values.name.trim() === "" ? "Name is required." : null,
        description: null,
        supplierOrgId: null,
        startDate: null,
      }),
    });

Render each field with `<FormInput config={fields.x} disabled={submit.isLoading} />`. Wrap the
handler with `onSubmit(cb)` — it validates first and only calls `cb(values)` when every error is
`null`. `onSubmit` returns an async listener; invoke it as `() => void handleCreate()`.

## 3. Submit state (`RemoteData`)

Model the write like any async state: a `RemoteData<string, T>` cell, `Loading()` before, `Failed` /
`Ready` inside `.fork`. The `submit.isLoading` flag (mirrored by the disabled submit button) guards
against double-submit:

    const [submit, setSubmit] = useState<RemoteData<string, Done>>(NotAsked());

    const handleCreate = onSubmit((values) => {
      if (submit.isLoading) return;
      setSubmit(Loading());
      call(api.createCampaign, toRequest(values)).fork(
        (err) => setSubmit(Failed(fetchErrorToString(err))),
        (_res) => { schedule(() => setSubmit(Ready(done))); },   // see §4
      );
    });

## 4. Read-after-write (`useProjectionDelay`)

Event-sourced writes return success the moment events commit; the Mongo read models the UI queries
catch up asynchronously. So any success-path work that re-reads (refetch, close a parent that
refetches, navigate to / display projected data) goes inside `schedule(() => { … })`:

    const { schedule } = useProjectionDelay();
    // on success:
    schedule(() => setSubmit(Ready(done)));   // default delay EVENTUAL_CONSISTENCY_WAIT_MS = 2500ms

The hook owns the cancel/unmount lifecycle. Keep the delay in the UI — the backend stays honest
about what "success" means.

## 5. Boundary conversions

Convert form strings and nullable selections at the submit boundary: `values.name.trim()`,
`DateOnly | null` → `POSIX | null` (a `dateOnlyToPosix` helper), wrap raw ids (`new Id<Org>(value)`),
and treat empty combobox selections as `null`. Cross-field rules (e.g. end-after-start) live in
`validate`.

## Surface variants

- **Frontend** — `@fe/*` aliases, web submit handlers, `derive` for computed text fields, the full
  field-config set, `uploadMultipart`.
- **Mobile** — `@/*` aliases, `Button.onPress`, bearer-token requests, only mobile-exported field
  types; do **not** import frontend-only hooks or invent a projection-delay helper without approval.

## Cross-references

- `./pages.md` — the page shell + `RemoteData` state machine hosting the form; `Future` vocab.
- `./tables.md` — rendering the collection a write mutates; refetch via the projection delay.
- `../core/typescript-effects.md` — `RemoteData` / `Future` / `Maybe` modeling, `satisfies never`.
- `../core/react.md` — named prop types, small composed children, colocated state.

## Do / Do not

- Do: use `api.*` + `call` / `query` / `uploadMultipart`; handle the `Future` with `.fork` at the boundary.
- Do: define `fields` with config classes; keep `validate` keyed to `fields` (`string | null`).
- Do: model submit state with `RemoteData`; set `Loading()` first; guard double-submit with the `submit.isLoading` flag and a disabled submit button.
- Do: wrap success-path read-model work in `useProjectionDelay`'s `schedule(() => …)`.
- Do not: raw `fetch` a domain command/query; add React Hook Form / Formik / Zod / a new request dep.
- Do not: use `validate` keys that don't match `fields`; mix `@fe/*` into mobile or `@/*` into frontend.
- Do not: refetch / re-read immediately after a write without `schedule`.
