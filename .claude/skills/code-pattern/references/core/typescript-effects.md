---
description: TypeScript effect types — Maybe, Result, RemoteData, Future for absence, errors, and async UI state.
globs: "*.ts, *.tsx"
alwaysApply: false
---

Favour explicit data flow, pure functions, composition, and monadic error handling; model absence, failure, and async state as values you handle explicitly with exhaustive matching.

## Maybe — Representing Absence

- Use `Maybe<T>` for optional computation, display helpers, and domain absence that should be handled explicitly. Construct with `Just(value)` or `Nothing()`.
- Keep `null`/`undefined` where the boundary owns that shape: JSON/API `s.nullable`, form empty values, DOM/file inputs, persisted read models, repository misses, and external SDK contracts.

- Pattern match with `instanceof Just` / `instanceof Nothing` + `satisfies never` in default. Don't use `isJust()`/`isNothing()` — they don't narrow types.
  ```ts
  switch (true) {
    case maybeUser instanceof Just:
      console.log(maybeUser.value);
      break;
    case maybeUser instanceof Nothing:
      console.log("No user");
      break;
    default:
      maybeUser satisfies never;
  }
  ```
- Use `.map(fn)` for transforms. Use `.chain(fn)` (flatMap) when `fn` returns `Maybe<T>` — avoids `Maybe<Maybe<T>>`.
- Use `.withDefault(fallback)` or `.maybe(default, fn)` for default values.
- Use `.alt(other)` to chain fallback Maybe values: `primary.alt(secondary).alt(fallback)`.
- Use `fromNullable()` for `null` and `fromOptional()` for `undefined` at system boundaries.
- Use `catMaybes(arr)` to filter out `Nothing` values, `mapMaybe(arr, fn)` to map+filter in one pass.
- Don't use `.expect()` for recoverable absence — it throws. Use `.withDefault()` or `.maybe()`.
- Don't mix `fromNullable` and `fromOptional` — they handle different nullish types.

---

## Result — Typed Error Handling

Use `Result<E, T>` for recoverable domain, decode, parse, and validation flows. Throw only for invariants, startup config, projection retry, and framework boundaries where the caller cannot recover locally.

- Construct with `Success<E, T>(value)` or `Failure<E, T>(error)` — callable without `new`.
- Use `.either(onError, onSuccess)` for exhaustive fold.
  ```ts
  const handle = (result: Result<Error, User>): string =>
    result.either(
      e => e.message,
      user => user.name,
    );
  ```
- Use `.chain(fn)` for monadic sequencing — short-circuits on first `Failure`.
  ```ts
  parseJson(input).chain(validate).chain(transform);
  ```
- Use `.map(fn)` for pure transforms on `Success`, `.mapFailure(fn)` to transform error types.
- Don't mix `Result` with `try/catch`. Don't use `.unwrap()` outside boundaries — it throws on `Failure`.
- `traverse` works with `List`, `traverse_` works with `Array`. Both short-circuit on first `Failure`.

---

## RemoteData — UI State Machine

Prefer `RemoteData<E, T>` to model async UI state.

- States: `NotAsked()`, `Loading()`, `Failed(error)`, `Ready(value)`.
- Pattern match with `instanceof` + `satisfies never`.
  ```ts
  switch (true) {
    case state instanceof Ready:
      render(state.value);
      break;
    case state instanceof Failed:
      showError(state.error);
      break;
    case state instanceof Loading:
      showSpinner();
      break;
    case state instanceof NotAsked:
      break;
    default:
      state satisfies never;
  }
  ```
- `.map(fn)` transforms only `Ready`; preserves `Loading`/`Failed`/`NotAsked`.
- `.chain(fn)` for `RemoteData`-returning functions — avoids double wrapping.
- `NotAsked` means "haven't asked yet". For "asked but empty", use `Ready([])`.
- Use `instanceof` for exhaustive rendering. Use `isReady`, `isLoading`, and similar helpers for guards, derived flags, and compact branches when no variant narrowing is needed.

---

## Future — Lazy Async Computation

Prefer `Future<E, T>` for app API calls, cancellable effects, and composed async flows. Keep `Promise` for Express handlers, repository methods, browser/native APIs, SecureStore, and framework contracts that require promises.

- Create with `Future.create<E, T>((reject, resolve) => { ... return cancelFn })`. Return the cancel function.
  ```ts
  const future = Future.create<never, number>((reject, resolve) => {
    const timer = setTimeout(() => resolve(42), 1000);
    return () => clearTimeout(timer);
  });
  ```
- Use `Future.createUncancellable` for inherently uncancellable operations.
- Nothing executes until `.fork(onError, onSuccess)` is called. `fork` returns a cancel function — store it if cancellation is needed.
- Don't use `Future.attemptP` for cancellable operations — it loses cancellation semantics. Use it only for wrapping simple Promises: `Future.attemptP(() => someAsyncFn())`.
- Don't double-wrap Promises: `Future.attemptP(() => fn())`, not `Future.attemptP(async () => { const r = await fn(); return r; })`.
- Use `.chain(fn)` for sequential async composition.
  ```ts
  fetchUser(id)
    .chain(user => fetchPosts(user.id).map(posts => ({ user, posts })))
    .fork(handleError, ({ user, posts }) => render(user, posts));
  ```
- Use `Future.parallel(limit, futures)` for bounded concurrency. Use `Future.concurrently({...})` for named concurrent operations.
- Use `.chainRej(fn)` to recover from errors. `.mapRej(fn)` transforms errors but stays rejected.
- Use `Future.bracket(acquire, release, use)` for guaranteed resource cleanup (locks, connections, file descriptors).
- Use `Future.race(a, b)` for timeouts.
- Convert to Promise with `await future.promise(e => new Error(String(e.message)))`.
- `attemptP` always produces `Future<Error, T>` — use `.mapRej()` to narrow the error type.
