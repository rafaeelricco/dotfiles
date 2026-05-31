# Forms and API Integration

Use this guide for frontend and mobile packages that expose local form/API helpers. Treat it as a package-local pattern.

## Audit

- Inspect the nearest `package.json`.
- Inspect local `src/api/endpoints.ts`, `src/api/request.ts`, `src/lib/request.ts`, and `src/components/ui/forms.tsx` when they exist.
- Inspect projection/read-after-write helpers when they exist.
- Read one or two nearby write flows before editing.

Report the audit briefly:

```md
Forms and API Integration Audit:
- Package surface:
- Local form helper:
- Local request helper:
- Nearby write/read flows:
- Read-after-write mechanism:
- Boundary decisions needed:
```

## Canonical references (by role, not fixed path)

- Endpoint map — the local `api` object and typed responses (e.g. `src/api/endpoints.ts`).
- Request helper — `call` / `query` and the `Future` / `Query` types (e.g. `src/api/request.ts`).
- Form helpers — `useForm`, field config classes, `FormInput` (e.g. `src/components/ui/forms.tsx`).
- Projection-delay hook — when the package exposes one.

## Imports

- Import the endpoint object and only the response types you use, via the local alias:

      import { api, type SomeResponse } from "@fe/api/endpoints"; // frontend
      import { api, type SomeResponse } from "@/api/endpoints";   // mobile

- Import the request helper from the same surface (`@fe/api/request` / `@/api/request`).
- Import only the form pieces the form uses from the local `components/ui/forms`.

## Calling the backend

- Use the typed `api` entries; invoke commands with `call(api.someCommand, requestBody)`.
- The result is a `Future`; handle outcomes with `.fork(onError, onSuccess)` at the execution boundary.
- Use `.chain` for ordered writes and `Future.parallel` / `Future.concurrently` for independent writes.
- Use the local multipart helper when one exists (frontend exports `uploadMultipart`; mobile may not).

## Forms (`useForm`)

- Define fields with **config classes**: `new TextInput({ ... })`, `new TextareaInput({ ... })`, `new DateInput({ ... })` — pick types from the local `forms` module.
- Pass `fields` and `validate` into `useForm`.
- `validate` returns an object with the **same keys as `fields`**; each value is `string | null` (`null` = no error).
- Wrap the submit handler with the returned `onSubmit`; render controlled pieces with `FormInput` when needed.
- Convert form strings and nullable selections at submit boundaries.
- Model submit state with nearby async state (usually `RemoteData`); use `fetchErrorToString` or the local equivalent for transport errors.

## After successful writes (read models / projections)

- Commands succeed when events commit; read-model projections may lag.
- Use the local projection-delay helper (e.g. `useProjectionDelay`) and run deferred success work — reset loading, callbacks, refetch, close dialogs, navigation — inside the scheduler it returns (`schedule(() => { ... })`).
- In mobile packages, do not import frontend-only hooks or invent a projection-delay helper without approval.

## Surface variants

- Frontend: `@fe/*` aliases, web submit handlers, more field types, `derive`.
- Mobile: `@/*` aliases, `Button.onPress`, bearer-token request behavior, mobile-exported field types only.

## Do not

- Raw `fetch` for normal backend commands or queries.
- React Hook Form, Formik, Zod, or a new request dependency without local precedent.
- Validation keys that don't match `fields`.
- `@fe/*` imports in mobile or `@/*` imports in frontend.
- Immediate projected refetch without the local projection-delay pattern.
