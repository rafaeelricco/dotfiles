/**
 * Trimmed reference excerpt — the form abstraction.
 *
 * Source: app/frontend/src/components/ui/forms.tsx (ambar/HartAgency), public API only.
 * Shows: the field config classes you instantiate (`new TextInput({...})`, etc.), the
 * `useForm({ fields, validate, derive })` hook returning `{ fields, onSubmit }`, and the
 * `FormInput` dispatcher that renders a field from its element config.
 *
 * Omitted from the original (~1325 lines), preserved verbatim where kept:
 *  - the per-field render components (FormTextField / FormTextareaField / FormDateField /
 *    FormTimeField / FormCheckboxField / FormComboboxField / FormSelectField / FormTagsField);
 *  - the Time / Checkbox / Select / Tags config classes (same shape as the four shown below);
 *  - the internal state helpers `getInitialState` / `buildProps` / `initialState` / `getValues` /
 *    `updateErrors` / `noErrors` / `applyDerive` (referenced by `useForm` below).
 * Read it for the call-site shape — it is not wired to compile standalone.
 */

export {
  useForm,
  FormLabel,
  FormInput,
  TextInput,
  TextareaInput,
  DateInput,
  TimeInput,
  CheckboxInput,
  ComboboxInput,
  SelectInput,
  TagsInput,
  TextElementConfig,
  TextareaElementConfig,
  DateElementConfig,
  TimeElementConfig,
  CheckboxElementConfig,
  ComboboxElementConfig,
  SelectElementConfig,
  TagsElementConfig,
  type FormConfig,
  type FormErrors,
  type FormOutputs,
  type TextInputType,
};

import * as React from "react";

import { CalendarIcon, Check, ChevronsUpDown, X, type LucideIcon } from "lucide-react";
import { fromNullable, fromOptional, Maybe, Nothing } from "@ambarltd/core/maybe";
import { DateOnly, TimeOfDay } from "@ambarltd/core/time";
import { ReactNode, useMemo, useState } from "react";
import { Button } from "@fe/components/ui/button";
import { Input } from "@fe/components/ui/input";
// ...remaining UI primitive imports (Textarea, Checkbox, Calendar, Popover, Command, Select, Label, cn)

// ============ Type plumbing ================
type ItemConfig =
  | TextInput
  | TextareaInput
  | DateInput
  | TimeInput
  | CheckboxInput
  | ComboboxInputBase
  | SelectInputBase
  | TagsInput;

type ItemProps<T> =
  T extends TextInput ? TextElementConfig
  : T extends TextareaInput ? TextareaElementConfig
  : T extends DateInput ? DateElementConfig
  : T extends TimeInput ? TimeElementConfig
  : T extends CheckboxInput ? CheckboxElementConfig
  : T extends SelectInputBase ? SelectElementConfig
  : T extends ComboboxInputBase ? ComboboxElementConfig
  : T extends TagsInput ? TagsElementConfig
  : never;

type ItemState<T extends ItemConfig> =
  T extends TextInput ? TextItemState
  : T extends TextareaInput ? TextareaItemState
  : T extends DateInput ? DateItemState
  : T extends TimeInput ? TimeItemState
  : T extends CheckboxInput ? CheckboxItemState
  : T extends SelectInputBase ? SelectItemState
  : T extends ComboboxInputBase ? ComboboxItemState
  : T extends TagsInput ? TagsItemState
  : never;

type ItemOutput<T> =
  T extends TextInput ? string
  : T extends TextareaInput ? string
  : T extends DateInput ? DateOnly | null
  : T extends TimeInput ? TimeOfDay | null
  : T extends CheckboxInput ? boolean
  : T extends SelectInputBase ? string | null
  : T extends ComboboxInputBase ? string | null
  : T extends TagsInput ? string[]
  : never;

type AnyElementConfig = ItemProps<ItemConfig>;
type FormInputs = Record<string, ItemConfig>;
type FormState<T extends FormInputs> = { [K in keyof T]: ItemState<T[K]> };
type FormProps<T extends FormInputs> = { [K in keyof T]: ItemProps<T[K]> };
type FormOutputs<T extends FormInputs> = { [K in keyof T]: ItemOutput<T[K]> };
type FormErrors<T extends FormInputs> = { [K in keyof T]: string | null };
type DerivableKeys<T extends FormInputs> = { [K in keyof T]: T[K] extends TextInput ? K : never }[keyof T];
type FormDerive<T extends FormInputs> = (v: FormOutputs<T>) => Partial<Record<DerivableKeys<T>, string>>;
type FormConfig<T extends FormInputs> = {
  fields: T;
  validate?: (v: FormOutputs<NoInfer<T>>) => FormErrors<NoInfer<T>>;
  derive?: FormDerive<NoInfer<T>>;
};

type SubmitEventListener = () => Promise<void>;
type OnSubmit<T extends FormInputs> = (f: (v: FormOutputs<T>) => void) => SubmitEventListener;
type HookReturn<T extends FormInputs> = { onSubmit: OnSubmit<T>; fields: FormProps<T> };

// ============ Text ================
type TextInputType = NonNullable<React.ComponentProps<typeof Input>["type"]>;

class TextInput {
  constructor(
    public values: {
      label: ReactNode;
      description?: ReactNode;
      type: TextInputType;
      defaultValue: string;
      placeholder?: string;
      icon?: LucideIcon;
    },
  ) {}
}

class TextItemState {
  constructor(public values: { value: string; error: Maybe<string> }) {}
  getValue(): string {
    return this.values.value;
  }
}

class TextElementConfig {
  constructor(
    public values: {
      name: string;
      value: string;
      type: TextInputType;
      label: ReactNode;
      description: Maybe<ReactNode>;
      placeholder: Maybe<string>;
      icon: Maybe<LucideIcon>;
      error: Maybe<string>;
      onChange: (value: string) => void;
    },
  ) {}
}

// ============ Textarea ================
class TextareaInput {
  constructor(
    public values: {
      label: ReactNode;
      description?: ReactNode;
      defaultValue: string;
      placeholder?: string;
      rows?: number;
    },
  ) {}
}

class TextareaItemState {
  constructor(public values: { value: string; error: Maybe<string> }) {}
  getValue(): string {
    return this.values.value;
  }
}

class TextareaElementConfig {
  constructor(
    public values: {
      name: string;
      value: string;
      label: ReactNode;
      description: Maybe<ReactNode>;
      placeholder: Maybe<string>;
      rows: number;
      error: Maybe<string>;
      onChange: (value: string) => void;
    },
  ) {}
}

// ============ Date (DateOnly) ================
class DateInput {
  constructor(
    public values: {
      label: ReactNode;
      description?: ReactNode;
      defaultValue: DateOnly | null;
      placeholder?: string;
    },
  ) {}
}

class DateItemState {
  constructor(public values: { value: DateOnly | null; error: Maybe<string> }) {}
  getValue(): DateOnly | null {
    return this.values.value;
  }
}

class DateElementConfig {
  constructor(
    public values: {
      name: string;
      value: DateOnly | null;
      label: ReactNode;
      description: Maybe<ReactNode>;
      placeholder: Maybe<string>;
      error: Maybe<string>;
      onChange: (value: DateOnly | null) => void;
    },
  ) {}
}

// ============ Time / Checkbox / Select / Tags ================
// Omitted here — TimeInput / CheckboxInput / SelectInput / TagsInput and their *ItemState /
// *ElementConfig classes follow the exact same shape as the four above. See source.

// ============ Combobox ================
type ComboboxValues<T> = {
  label: ReactNode;
  description?: ReactNode;
  items: readonly T[];
  defaultValue: string | null;
  getValue: (item: T) => string;
  getLabel: (item: T) => ReactNode;
  getKey?: (item: T) => string;
  itemToString?: (item: T) => string;
  placeholder?: string;
  emptyMessage?: string;
  allowClear?: boolean;
};

class ComboboxInputBase {
  constructor(public values: ComboboxValues<any>) {}
}

class ComboboxInput<T> extends ComboboxInputBase {
  constructor(values: ComboboxValues<T>) {
    super(values);
  }

  declare values: ComboboxValues<T>;
}

class ComboboxItemState {
  constructor(public values: { value: string | null; error: Maybe<string> }) {}
  getValue(): string | null {
    return this.values.value;
  }
}

type ComboboxElementValues = {
  name: string;
  items: readonly any[];
  value: string | null;
  label: ReactNode;
  description: Maybe<ReactNode>;
  placeholder: Maybe<string>;
  emptyMessage: string;
  allowClear: boolean;
  getValue: (item: any) => string;
  getLabel: (item: any) => ReactNode;
  getKey: (item: any) => string;
  itemToString: (item: any) => string;
  error: Maybe<string>;
  onChange: (value: string | null) => void;
};

class ComboboxElementConfig {
  constructor(public values: ComboboxElementValues) {}
}

// ============ Hook ================
// `initialState` / `buildProps` / `getValues` / `updateErrors` / `noErrors` / `applyDerive`
// are omitted from this excerpt (defined in source). `useForm` itself is kept verbatim:
function useForm<T extends FormInputs>({ fields, validate = noErrors, derive }: FormConfig<T>): HookReturn<T> {
  const initial = useMemo(() => initialState(fields), [fields]);
  const [state, setState] = useState(initial);
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set());
  const [validateOnChange, setValidateOnChange] = useState(false);

  const effective = applyDerive(state, touched, derive);

  const props: Record<string, AnyElementConfig> = {};
  for (const key of Object.keys(fields)) {
    props[key] = buildProps(key, fields[key]!, effective[key]! as never, s => {
      const isEmptyText = s instanceof TextItemState && s.values.value === "";
      const nextTouched: ReadonlySet<string> =
        isEmptyText ?
          touched.has(key) ?
            new Set([...touched].filter(k => k !== key))
          : touched
        : touched.has(key) ? touched
        : new Set(touched).add(key);
      setTouched(nextTouched);
      setState(current => {
        const next = { ...current, [key]: s } as FormState<T>;
        if (validateOnChange) {
          return updateErrors(validate(getValues(applyDerive(next, nextTouched, derive))), next);
        }
        return next;
      });
    });
  }

  const onSubmit: OnSubmit<T> = f => async () => {
    setValidateOnChange(true);
    const values = getValues(effective);
    const errors = validate(values);
    setState(s => updateErrors(errors, s));
    if (Object.values(errors).every(v => v === null)) {
      f(values);
    }
  };

  return { onSubmit, fields: props as FormProps<T> };
}

// ============ Renderer ================
// Dispatches on the element-config class, closing with `satisfies never` for exhaustiveness.
// The per-field components (FormTextField, FormComboboxField, …) are omitted from this excerpt.
const FormInput: React.FC<{ config: AnyElementConfig; className?: string; disabled?: boolean }> = ({
  config,
  className,
  disabled,
}) => {
  if (config instanceof TextElementConfig) {
    return <FormTextField config={config} className={className} disabled={disabled} />;
  }
  if (config instanceof TextareaElementConfig) {
    return <FormTextareaField config={config} className={className} disabled={disabled} />;
  }
  if (config instanceof DateElementConfig) {
    return <FormDateField config={config} className={className} disabled={disabled} />;
  }
  if (config instanceof TimeElementConfig) {
    return <FormTimeField config={config} className={className} disabled={disabled} />;
  }
  if (config instanceof CheckboxElementConfig) {
    return <FormCheckboxField config={config} className={className} disabled={disabled} />;
  }
  if (config instanceof ComboboxElementConfig) {
    return <FormComboboxField config={config} className={className} disabled={disabled} />;
  }
  if (config instanceof SelectElementConfig) {
    return <FormSelectField config={config} className={className} disabled={disabled} />;
  }
  if (config instanceof TagsElementConfig) {
    return <FormTagsField config={config} className={className} disabled={disabled} />;
  }

  return config satisfies never;
};
