---
description: TypeScript modeling conventions — type-driven design, domain state machines, decoders/encoders/schemas.
globs: "*.ts, *.tsx"
alwaysApply: false
---

Favour static types, exhaustive matching, strict generics, and branded values over raw primitives; make illegal states unrepresentable and normalize transport/DTO shapes into domain types at boundaries.

## Table of contents

- [Type Design](#type-design)
- [Domain Modeling](#domain-modeling)
- [Parsing & Validation](#parsing--validation)
- [Decoders - Validating Incoming Data](#decoders--validating-incoming-data)
- [Encoders - Formatting Output Data](#encoders--formatting-output-data)
- [Schemas - Bidirectional Mapping](#schemas--bidirectional-mapping)

## Type Design

- Use a **reusable `Id<T>` class** for entity IDs. Don't use `string & { __brand }` intersections — they allow name collisions, leak `__brand` into intellisense, and accept raw strings without constructors.

  ```ts
  // reusable ID class
  class Id<T> {
    // @ts-expect-error the existence of _tag prevents structural comparison
    private readonly _tag: T | null = null;
    constructor(public value: string) {}
    // ...other useful methods
  }

  // Id<T> in use
  class Foo {
    constructor(readonly id: Id<Foo>) {}
  }
  ```

- Use **discriminated unions** to make invalid states unrepresentable. Don't use bags of optional properties when combinations create impossible states.
  ```ts
  type State = { status: "loading" } | { status: "error"; error: Error } | { status: "success"; data: { id: string } };
  ```
- Use **exhaustive `switch`** with a `never` default on discriminated unions, or **`match` from [ts-pattern](https://github.com/gvergnaud/ts-pattern)**. Both force handling new variants at compile time.

  ```ts
  // switch with never default
  default: {
    const _exhaustiveCheck: never = config;
    throw new Error(`Unknown: ${JSON.stringify(_exhaustiveCheck)}`);
  }

  // ts-pattern
  import { match } from "ts-pattern";
  const result = match(state)
    .with({ status: "loading" }, () => "Loading...")
    .with({ status: "error" }, ({ error }) => error.message)
    .with({ status: "success" }, ({ data }) => data.id)
    .exhaustive();
  ```

- Don't use **empty objects** (e.g. `ConversationId.empty()`) to represent absence. Use `Maybe<T>` with `Nothing()` instead.
- Prefer **`as const` tuples** for new finite value sets. Avoid converting existing local `enum` usage unless the requested change already touches that contract. Derive the type with `type X = (typeof X)[number]`.
  ```ts
  const PACK_STATUSES = ["Draft", "Approved", "Shipped"] as const;
  type PackStatus = (typeof PACK_STATUSES)[number];
  ```
- **Declare return types** on top-level module functions. Exception: JSX components returning JSX.
- Avoid app-level `any`. Use strict generics to preserve type information. Constrained type erasure is acceptable inside framework helpers, schema registries, constructor plumbing, and generic UI internals when the boundary restores type safety:
  ```ts
  function parse<T>(data: { result: T }): T {
    return data.result;
  }
  ```

## Domain Modeling

- Co-locate a `static schema` factory on the generic `Id<T>` class for native serialization/deserialization, then expose a typed `schema` per domain class.

  ```ts
  class Id<T> {
    // @ts-expect-error the existence of _tag prevents structural comparison
    private readonly _tag: T | null = null;
    constructor(public value: string) {}
    static schema<T>() {
      return idSchema<T>();
    }
  }

  class Message {
    static schema = Id.schema<Message>();
    constructor(readonly id: Id<Message>) {}
  }
  ```

- Model rich content (LLM outputs, conversation events) with `s.discriminatedUnion` + `s.variant`. Don't use giant bags of optional properties.
  ```ts
  const schema_AgentExecutionTrace = s.discriminatedUnion([
    s.variant({ type: "text", text: s.string }),
    s.variant({ type: "tool_call", name: s.string, input: s.json, result: schema_Result(schema_Error, s.json) }),
    s.variant({ type: "error", message: s.string, code: s.optional(s.string) }),
  ]);
  ```
- Bundle related state into **union-driven state machines**. Don't use loose boolean flags (`isStreaming`, `isError`, `isLoading`) spread across stores.

  ```ts
  type Stream<E, R> =
    | { type: "not_started" }
    | { type: "streaming"; results: R[] }
    | { type: "done"; results: R[] }
    | { type: "error"; error: E };

  type VoiceConnection =
    | { type: "disconnected" }
    | { type: "connecting" }
    | { type: "transcribing"; transcription: string }
    | { type: "error"; error: FetchErrorResponse };

  type UserInput = { type: "text"; content: string } | { type: "voice"; connection: VoiceConnection };

  interface ActiveConversation {
    id: ConversationId;
    messages: Array<Message>;
    inputMode: UserInput;
    streamingResponse: Stream<Error, string>;
  }
  ```

---

## Parsing & Validation

### Decoders — Validating Incoming Data

- Never cast `JSON.parse(x) as T`. Validate with a decoder returning `Result<string, T>`.
  ```ts
  const result = Decoder.decode(JSON.parse(input), Decoder.string);
  ```
- Build object decoders with `Decoder.object({ ... })`.
- Use `Decoder.optional()` for fields that may not exist (`V | undefined`).
- Use `Decoder.nullable()` for fields where value may be `null` (`V | null`).
- Use `Decoder.optionalNullable()` for fields that may be absent OR null.
- Use `Decoder.optionalMaybe()` for missing → `Maybe<V>`.
- Use `Decoder.oneOf()` + `Decoder.stringLiteral()` for discriminated JSON unions.
- Always derive types from decoders: `type User = Decoder.Infer<typeof userDecoder>`. Don't cast with `as` after decode.
- Use `.chain()` for version-dependent decoding.
- Use `Decoder.objectMap()` for `{ [key: string]: T }` shapes. Don't use `Decoder.object()` for dynamic keys.

### Encoders — Formatting Output Data

- Use `E.object<T>({...})` for structured serialization.
- Use `E.optional(encoder)` to omit fields when `undefined`.
- Transform inputs with `.rmap(fn)` (contravariant — transforms input before encoding).
  ```ts
  const dateEncoder = E.string.rmap((d: Date) => d.toISOString());
  const userIdEncoder = E.string.rmap((id: UserId) => id.value);
  ```
- Use `E.oneOf<T>(selector)` for dynamic encoder selection.
- Use `E.both(enc1, enc2)` to merge encoder outputs.
- Must call `.run(value)` to execute — `Encoder<A>` is a description, not a result.
- Don't use `E.maybe()` for optional fields — it produces `{ just: V }` structure. Use `E.optional()`.
- `E.EncoderOptional` only works within `E.object()` field definitions.

### Schemas — Bidirectional Mapping

- A `Schema` is a combined `Decoder` + `Encoder`. Build with `s.string.dimap(decode, encode)`.
- Keep schemas as `static schema` on domain classes (and on the generic `Id<T>`) — co-location keeps the schema and the type it describes in sync as the class evolves.

  ```ts
  class Id<T> {
    // @ts-expect-error the existence of _tag prevents structural comparison
    private readonly _tag: T | null = null;
    constructor(public value: string) {}
    static schema<T>() {
      return s.string.dimap(
        v => new Id<T>(v),
        id => id.value,
      );
    }
  }

  class Message {
    static schema = Id.schema<Message>();
    constructor(readonly id: Id<Message>) {}
  }
  ```

- Use `s.discriminatedUnion` + `s.variant` for sum types.
  ```ts
  const Message = s.discriminatedUnion([
    s.variant({ type: "error", code: s.number, message: s.string }),
    s.variant({ type: "success", value: s.string }),
  ]);
  type Message = s.Infer<typeof Message>;
  ```
- Use `s.optional()` for missing keys. Use `s.nullable()` for present-but-null values. Don't combine into `s.optional(s.maybe(x))` — creates `Maybe<Maybe<T>>`.
