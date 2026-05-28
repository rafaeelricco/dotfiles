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

## Shared Pattern

- Use the package-local form abstraction: `useForm`, config classes, and `FormInput` when exported.
- Keep `validate` keyed to `fields`; each field error is `string | null`.
- Convert form strings and nullable selections at submit boundaries.
- Model submit state with nearby async state patterns, usually `RemoteData`.
- Use `fetchErrorToString` or the local equivalent for transport errors.

## API Calls

- Use local `api` and request helpers.
- Use `call(api.someEndpoint, requestBody)` for domain commands and queries.
- Handle `Future` with `.fork(onError, onSuccess)` at the execution boundary.
- Use `.chain` for ordered writes and `Future.parallel` / `Future.concurrently` for independent writes.
- Use the local multipart helper when one exists. Frontend exports `uploadMultipart`; mobile does not in the inspected code.

## Read After Write

- Use the local read-after-write mechanism when success refetches, closes a parent that refetches, navigates to projected data, or displays projected data.
- In web/frontend packages, use the local projection-delay helper, such as `useProjectionDelay`, and place read-model-dependent work inside the scheduler it returns.
- In mobile packages, do not import frontend-only hooks or invent a projection-delay helper without approval.

## Surface Variants

- Frontend packages may use aliases such as `@fe/*`, web form submit handlers, more field types, and `derive`.
- Mobile packages may use aliases such as `@/*`, `Button.onPress`, bearer-token request behavior, and only mobile-exported field types.

## Smells

- Raw `fetch` for normal backend commands or queries.
- React Hook Form, Formik, Zod, or a new request dependency without local precedent.
- Validation keys that do not match `fields`.
- `@fe/*` imports in mobile or `@/*` imports in frontend.
- Immediate projected refetch without the local projection-delay pattern.
