'use client';
import { useState, useCallback } from 'react';
import type { ZodTypeAny } from 'zod';

// ── Type Utilities ────────────────────────────────────────────────────────────

interface UnwrappedSchema {
  inner: ZodTypeAny;
  optional: boolean;
  nullable: boolean;
  defaultValue: any;
  hasDefault: boolean;
}

/** Strip Optional / Nullable / Default / Branded / Readonly wrappers */
function unwrap(schema: ZodTypeAny): UnwrappedSchema {
  let s = schema;
  let optional = false;
  let nullable = false;
  let defaultValue: any = undefined;
  let hasDefault = false;

  for (;;) {
    const tn: string = (s as any)._def.typeName;
    if (tn === 'ZodOptional') {
      optional = true;
      s = (s as any)._def.innerType;
    } else if (tn === 'ZodNullable') {
      nullable = true;
      s = (s as any)._def.innerType;
    } else if (tn === 'ZodDefault') {
      hasDefault = true;
      defaultValue = (s as any)._def.defaultValue?.();
      s = (s as any)._def.innerType;
    } else if (tn === 'ZodCatch') {
      s = (s as any)._def.innerType;
    } else if (tn === 'ZodBranded') {
      s = (s as any)._def.type;
    } else if (tn === 'ZodReadonly') {
      s = (s as any)._def.innerType;
    } else if (tn === 'ZodLazy') {
      s = (s as any)._def.getter();
    } else {
      break;
    }
  }

  return { inner: s, optional, nullable, defaultValue, hasDefault };
}

function typeName(schema: ZodTypeAny): string {
  return (schema as any)._def.typeName ?? 'Unknown';
}

interface StringMeta {
  isEmail: boolean;
  isUrl: boolean;
  isUuid: boolean;
  min?: number;
  max?: number;
}

function getStringMeta(schema: ZodTypeAny): StringMeta {
  const checks: any[] = (schema as any)._def.checks ?? [];
  return {
    isEmail: checks.some((c) => c.kind === 'email'),
    isUrl: checks.some((c) => c.kind === 'url'),
    isUuid: checks.some((c) => c.kind === 'uuid'),
    min: checks.find((c) => c.kind === 'min')?.value,
    max: checks.find((c) => c.kind === 'max')?.value,
  };
}

interface NumberMeta {
  isInt: boolean;
  min?: number;
  max?: number;
  multipleOf?: number;
}

function getNumberMeta(schema: ZodTypeAny): NumberMeta {
  const checks: any[] = (schema as any)._def.checks ?? [];
  return {
    isInt: checks.some((c) => c.kind === 'int'),
    min: checks.find((c) => c.kind === 'min')?.value,
    max: checks.find((c) => c.kind === 'max')?.value,
    multipleOf: checks.find((c) => c.kind === 'multipleOf')?.value,
  };
}

function toLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

const MULTILINE_KEYS = ['description', 'content', 'body', 'html', 'text', 'bio', 'summary', 'excerpt', 'markdown', 'note', 'notes', 'message', 'caption', 'abstract'];

function isMultilineKey(key: string): boolean {
  const lower = key.toLowerCase();
  return MULTILINE_KEYS.some((k) => lower === k || lower.endsWith(k) || lower.includes(k));
}

// ── Field Config (from BlockConfig.data / BlockConfig.ui) ──────────────────

export interface FieldConfig {
  label?: string;
  description?: string;
  renderEditor?: (value: any, onChange: (value: any) => void) => React.ReactNode;
}

export type FormConfig = Record<string, FieldConfig | undefined>;

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconClose() {
  return (
    <svg viewBox="0 -960 960 960" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z" />
    </svg>
  );
}

function IconAdd() {
  return (
    <svg viewBox="0 -960 960 960" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z" />
    </svg>
  );
}

function IconLink() {
  return (
    <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor" aria-hidden="true">
      <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3Z" />
      <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865Z" />
    </svg>
  );
}

function IconEmail() {
  return (
    <svg viewBox="0 0 20 20" width="13" height="13" fill="currentColor" aria-hidden="true">
      <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
      <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
    </svg>
  );
}

function IconChevronDown() {
  return (
    <svg viewBox="0 0 20 20" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function IconSave() {
  return (
    <svg viewBox="0 -960 960 960" width="15" height="15" fill="currentColor" aria-hidden="true">
      <path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z" />
    </svg>
  );
}

function IconDrag() {
  return (
    <svg viewBox="0 -960 960 960" width="14" height="14" fill="currentColor" aria-hidden="true">
      <path d="M360-160q-33 0-56.5-23.5T280-240q0-33 23.5-56.5T360-320q33 0 56.5 23.5T440-240q0 33-23.5 56.5T360-160Zm240 0q-33 0-56.5-23.5T520-240q0-33 23.5-56.5T600-320q33 0 56.5 23.5T680-240q0 33-23.5 56.5T600-160ZM360-400q-33 0-56.5-23.5T280-480q0-33 23.5-56.5T360-560q33 0 56.5 23.5T440-480q0 33-23.5 56.5T360-400Zm240 0q-33 0-56.5-23.5T520-480q0-33 23.5-56.5T600-560q33 0 56.5 23.5T680-480q0 33-23.5 56.5T600-400ZM360-640q-33 0-56.5-23.5T280-720q0-33 23.5-56.5T360-800q33 0 56.5 23.5T440-720q0 33-23.5 56.5T360-640Zm240 0q-33 0-56.5-23.5T520-720q0-33 23.5-56.5T600-800q33 0 56.5 23.5T680-720q0 33-23.5 56.5T600-640Z" />
    </svg>
  );
}

// ── Field Wrapper ─────────────────────────────────────────────────────────────

interface FieldWrapperProps {
  label: string;
  description?: string;
  optional?: boolean;
  children: React.ReactNode;
  htmlFor?: string;
}

function FieldWrapper({ label, description, optional, children, htmlFor }: FieldWrapperProps) {
  return (
    <div className="zf-field">
      <div className="zf-field-header">
        <label className="zf-label" htmlFor={htmlFor}>
          {label}
        </label>
        {optional && <span className="zf-badge zf-badge--optional">optional</span>}
      </div>
      {description && <p className="zf-description">{description}</p>}
      <div className="zf-field-control">{children}</div>
    </div>
  );
}

// ── String Field ──────────────────────────────────────────────────────────────

function StringField({
  id,
  schema,
  value,
  onChange,
  fieldKey,
  placeholder,
}: {
  id?: string;
  schema: ZodTypeAny;
  value: string | undefined;
  onChange: (v: string) => void;
  fieldKey?: string;
  placeholder?: string;
}) {
  const { isEmail, isUrl, max } = getStringMeta(schema);
  const useTextarea =
    (max !== undefined && max > 200) || (fieldKey ? isMultilineKey(fieldKey) : false);

  const inputType = isEmail ? 'email' : isUrl ? 'url' : 'text';

  if (useTextarea) {
    return (
      <textarea
        id={id}
        className="zf-input zf-textarea"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
      />
    );
  }

  return (
    <div className={`zf-input-group${isUrl || isEmail ? ' zf-input-group--icon' : ''}`}>
      {isUrl && (
        <span className="zf-input-icon">
          <IconLink />
        </span>
      )}
      {isEmail && (
        <span className="zf-input-icon">
          <IconEmail />
        </span>
      )}
      <input
        id={id}
        type={inputType}
        className="zf-input"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? (isUrl ? 'https://' : isEmail ? 'name@example.com' : '')}
        autoComplete={isEmail ? 'email' : isUrl ? 'url' : 'off'}
      />
    </div>
  );
}

// ── Number Field ──────────────────────────────────────────────────────────────

function NumberField({
  id,
  schema,
  value,
  onChange,
}: {
  id?: string;
  schema: ZodTypeAny;
  value: number | undefined;
  onChange: (v: number | undefined) => void;
}) {
  const { isInt, min, max, multipleOf } = getNumberMeta(schema);
  return (
    <input
      id={id}
      type="number"
      className="zf-input"
      value={value ?? ''}
      min={min}
      max={max}
      step={multipleOf ?? (isInt ? 1 : 'any')}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') {
          onChange(undefined);
          return;
        }
        const v = isInt ? parseInt(raw, 10) : parseFloat(raw);
        if (!isNaN(v)) onChange(v);
      }}
    />
  );
}

// ── Boolean Toggle ────────────────────────────────────────────────────────────

function BooleanField({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: boolean | undefined;
  onChange: (v: boolean) => void;
}) {
  const checked = value ?? false;
  return (
    <div className="zf-toggle-row">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`zf-toggle${checked ? ' zf-toggle--on' : ''}`}
        onClick={() => onChange(!checked)}
      >
        <span className="zf-toggle-thumb" />
      </button>
      <span className="zf-toggle-status">{checked ? 'Enabled' : 'Disabled'}</span>
    </div>
  );
}

// ── Enum Select ───────────────────────────────────────────────────────────────

function EnumField({
  id,
  options,
  labels,
  value,
  onChange,
}: {
  id?: string;
  options: string[];
  labels?: Record<string, string>;
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  return (
    <div className="zf-select-wrapper">
      <select
        id={id}
        className="zf-select"
        value={value ?? options[0] ?? ''}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {labels?.[opt] ?? opt}
          </option>
        ))}
      </select>
      <span className="zf-select-chevron">
        <IconChevronDown />
      </span>
    </div>
  );
}

// ── Union Literals (radio group) ──────────────────────────────────────────────

function UnionLiteralField({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: string[];
  value: string | undefined;
  onChange: (v: string) => void;
}) {
  const selected = value ?? options[0];
  return (
    <div className="zf-radio-group" role="radiogroup">
      {options.map((opt) => (
        <label key={opt} className={`zf-radio${selected === opt ? ' zf-radio--selected' : ''}`}>
          <input
            type="radio"
            name={name}
            value={opt}
            checked={selected === opt}
            onChange={() => onChange(opt)}
            className="zf-radio-input"
          />
          <span className="zf-radio-mark" />
          <span className="zf-radio-label">{opt}</span>
        </label>
      ))}
    </div>
  );
}

// ── Date Field ────────────────────────────────────────────────────────────────

function DateField({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: Date | string | undefined;
  onChange: (v: Date | undefined) => void;
}) {
  const isoValue =
    value instanceof Date
      ? value.toISOString().slice(0, 10)
      : typeof value === 'string'
        ? value.slice(0, 10)
        : '';

  return (
    <input
      id={id}
      type="date"
      className="zf-input"
      value={isoValue}
      onChange={(e) => (e.target.value ? onChange(new Date(e.target.value)) : onChange(undefined))}
    />
  );
}

// ── Array Field ───────────────────────────────────────────────────────────────

function ArrayField({
  schema,
  value,
  onChange,
  fieldKey,
  config,
}: {
  schema: ZodTypeAny;
  value: any[] | undefined;
  onChange: (v: any[]) => void;
  fieldKey: string;
  config?: FormConfig;
}) {
  const items = value ?? [];
  const rawItemSchema: ZodTypeAny = (schema as any)._def.type;
  const { inner: itemSchema } = unwrap(rawItemSchema);
  const itemTypeName = typeName(itemSchema);

  const getDefaultItem = (): any => {
    switch (itemTypeName) {
      case 'ZodString':
        return '';
      case 'ZodNumber':
        return 0;
      case 'ZodBoolean':
        return false;
      case 'ZodObject':
        return {};
      case 'ZodArray':
        return [];
      default:
        return '';
    }
  };

  const add = () => onChange([...items, getDefaultItem()]);
  const remove = (i: number) => {
    const n = [...items];
    n.splice(i, 1);
    onChange(n);
  };
  const update = (i: number, v: any) => {
    const n = [...items];
    n[i] = v;
    onChange(n);
  };

  return (
    <div className="zf-array">
      {items.length === 0 && <p className="zf-array-empty">No items yet — add one below.</p>}
      {items.map((item, i) => (
        <div key={i} className="zf-array-row">
          <span className="zf-array-drag" title="Drag to reorder">
            <IconDrag />
          </span>
          <div className="zf-array-row-content">
            {itemTypeName === 'ZodString' && (
              <StringField
                schema={itemSchema}
                value={item}
                onChange={(v) => update(i, v)}
                fieldKey={fieldKey}
              />
            )}
            {itemTypeName === 'ZodNumber' && (
              <NumberField schema={itemSchema} value={item} onChange={(v) => update(i, v)} />
            )}
            {itemTypeName === 'ZodBoolean' && (
              <BooleanField value={item} onChange={(v) => update(i, v)} />
            )}
            {itemTypeName === 'ZodEnum' && (
              <EnumField
                options={(itemSchema as any)._def.values}
                value={item}
                onChange={(v) => update(i, v)}
              />
            )}
            {itemTypeName === 'ZodObject' && (
              <div className="zf-nested">
                <ObjectFields
                  schema={itemSchema}
                  value={item ?? {}}
                  onChange={(v) => update(i, v)}
                  config={config}
                  depth={1}
                />
              </div>
            )}
            {!['ZodString', 'ZodNumber', 'ZodBoolean', 'ZodEnum', 'ZodObject'].includes(
              itemTypeName,
            ) && <span className="zf-unsupported">{itemTypeName}</span>}
          </div>
          <button
            type="button"
            className="zf-array-remove"
            onClick={() => remove(i)}
            aria-label="Remove item"
            title="Remove"
          >
            <IconClose />
          </button>
        </div>
      ))}
      <button type="button" className="zf-array-add" onClick={add}>
        <IconAdd />
        Add item
      </button>
    </div>
  );
}

// ── Object Fields (recursive renderer) ───────────────────────────────────────

interface ObjectFieldsProps {
  schema: ZodTypeAny;
  value: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
  config?: FormConfig;
  depth?: number;
  idPrefix?: string;
}

function ObjectFields({
  schema,
  value,
  onChange,
  config,
  depth = 0,
  idPrefix = 'zf',
}: ObjectFieldsProps) {
  const shape: Record<string, ZodTypeAny> =
    typeof (schema as any)._def.shape === 'function'
      ? (schema as any)._def.shape()
      : ((schema as any)._def.shape ?? {});

  return (
    <>
      {Object.entries(shape).map(([key, rawSchema]) => {
        const { inner, optional, defaultValue, hasDefault } = unwrap(rawSchema as ZodTypeAny);
        const tn = typeName(inner);
        const fieldConfig = config?.[key];
        const label = fieldConfig?.label ?? toLabel(key);
        const description = fieldConfig?.description;
        const val = value?.[key];
        const set = (v: any) => onChange({ ...(value ?? {}), [key]: v });
        const fieldId = `${idPrefix}-${key}`;
        const placeholderFromDefault =
          hasDefault && defaultValue !== undefined && defaultValue !== null
            ? String(defaultValue)
            : undefined;

        // ── Custom renderer ──────────────────────────────────────────────────
        if (fieldConfig?.renderEditor) {
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
              htmlFor={fieldId}
            >
              {fieldConfig.renderEditor(val, set)}
            </FieldWrapper>
          );
        }

        // ── ZodString ────────────────────────────────────────────────────────
        if (tn === 'ZodString') {
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
              htmlFor={fieldId}
            >
              <StringField
                id={fieldId}
                schema={inner}
                value={val}
                onChange={set}
                fieldKey={key}
                placeholder={placeholderFromDefault}
              />
            </FieldWrapper>
          );
        }

        // ── ZodNumber ────────────────────────────────────────────────────────
        if (tn === 'ZodNumber') {
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
              htmlFor={fieldId}
            >
              <NumberField id={fieldId} schema={inner} value={val} onChange={set} />
            </FieldWrapper>
          );
        }

        // ── ZodBoolean ───────────────────────────────────────────────────────
        if (tn === 'ZodBoolean') {
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
              htmlFor={fieldId}
            >
              <BooleanField id={fieldId} value={val} onChange={set} />
            </FieldWrapper>
          );
        }

        // ── ZodEnum ──────────────────────────────────────────────────────────
        if (tn === 'ZodEnum') {
          const options: string[] = (inner as any)._def.values;
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
              htmlFor={fieldId}
            >
              <EnumField id={fieldId} options={options} value={val} onChange={set} />
            </FieldWrapper>
          );
        }

        // ── ZodNativeEnum ────────────────────────────────────────────────────
        if (tn === 'ZodNativeEnum') {
          const enumObj = (inner as any)._def.values as Record<string, any>;
          // Filter out reverse-mapped numeric keys from TypeScript numeric enums
          const options = Object.keys(enumObj).filter((k) => isNaN(Number(k)));
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
              htmlFor={fieldId}
            >
              <EnumField id={fieldId} options={options} value={val} onChange={set} />
            </FieldWrapper>
          );
        }

        // ── ZodLiteral ───────────────────────────────────────────────────────
        if (tn === 'ZodLiteral') {
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
              htmlFor={fieldId}
            >
              <div className="zf-literal">{String((inner as any)._def.value)}</div>
            </FieldWrapper>
          );
        }

        // ── ZodUnion ─────────────────────────────────────────────────────────
        if (tn === 'ZodUnion') {
          const unionOptions: ZodTypeAny[] = (inner as any)._def.options;
          const allLiterals = unionOptions.every(
            (o: any) => o._def.typeName === 'ZodLiteral',
          );
          if (allLiterals) {
            const literals: string[] = unionOptions.map((o: any) => String(o._def.value));
            // Use radio group for small sets, select for larger sets
            if (literals.length <= 5) {
              return (
                <FieldWrapper
                  key={key}
                  label={label}
                  description={description}
                  optional={optional}
                >
                  <UnionLiteralField
                    name={fieldId}
                    options={literals}
                    value={val}
                    onChange={set}
                  />
                </FieldWrapper>
              );
            } else {
              return (
                <FieldWrapper
                  key={key}
                  label={label}
                  description={description}
                  optional={optional}
                  htmlFor={fieldId}
                >
                  <EnumField id={fieldId} options={literals} value={val} onChange={set} />
                </FieldWrapper>
              );
            }
          }
          // Non-literal union: not supported visually
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
            >
              <div className="zf-unsupported">
                Complex union types are not supported in the visual editor.
              </div>
            </FieldWrapper>
          );
        }

        // ── ZodDiscriminatedUnion ────────────────────────────────────────────
        if (tn === 'ZodDiscriminatedUnion') {
          const discriminator: string = (inner as any)._def.discriminator;
          const unionOptionsMap: Map<string, ZodTypeAny> = (inner as any)._def.optionsMap;
          const discriminatorOptions = Array.from(unionOptionsMap.keys()).map(String);
          const currentDiscriminator = val?.[discriminator] ?? discriminatorOptions[0];
          const matchedSchema = unionOptionsMap.get(currentDiscriminator);

          const handleDiscriminatorChange = (newDiscriminator: string) => {
            set({ [discriminator]: newDiscriminator });
          };

          return (
            <div key={key} className="zf-section">
              <div className="zf-section-header">
                <span className="zf-section-label">{label}</span>
                {optional && <span className="zf-badge zf-badge--optional">optional</span>}
              </div>
              {description && <p className="zf-description">{description}</p>}
              <div className="zf-nested">
                <FieldWrapper label={toLabel(discriminator)} htmlFor={`${fieldId}-disc`}>
                  <EnumField
                    id={`${fieldId}-disc`}
                    options={discriminatorOptions}
                    value={currentDiscriminator}
                    onChange={handleDiscriminatorChange}
                  />
                </FieldWrapper>
                {matchedSchema && (
                  <ObjectFields
                    schema={matchedSchema}
                    value={val ?? { [discriminator]: currentDiscriminator }}
                    onChange={set}
                    config={config}
                    depth={depth + 1}
                    idPrefix={`${idPrefix}-${key}`}
                  />
                )}
              </div>
            </div>
          );
        }

        // ── ZodArray ─────────────────────────────────────────────────────────
        if (tn === 'ZodArray') {
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
            >
              <ArrayField
                schema={inner}
                value={val}
                onChange={set}
                fieldKey={key}
                config={config}
              />
            </FieldWrapper>
          );
        }

        // ── ZodObject ────────────────────────────────────────────────────────
        if (tn === 'ZodObject') {
          return (
            <div key={key} className="zf-section">
              <div className="zf-section-header">
                <span className="zf-section-label">{label}</span>
                {optional && <span className="zf-badge zf-badge--optional">optional</span>}
              </div>
              {description && <p className="zf-description zf-description--section">{description}</p>}
              <div className="zf-nested">
                <ObjectFields
                  schema={inner}
                  value={val ?? {}}
                  onChange={set}
                  config={config}
                  depth={depth + 1}
                  idPrefix={`${idPrefix}-${key}`}
                />
              </div>
            </div>
          );
        }

        // ── ZodDate ──────────────────────────────────────────────────────────
        if (tn === 'ZodDate') {
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
              htmlFor={fieldId}
            >
              <DateField id={fieldId} value={val} onChange={set} />
            </FieldWrapper>
          );
        }

        // ── ZodRecord ────────────────────────────────────────────────────────
        if (tn === 'ZodRecord') {
          return (
            <FieldWrapper
              key={key}
              label={label}
              description={description}
              optional={optional}
            >
              <div className="zf-unsupported">
                Record / map fields are not supported in the visual editor.
              </div>
            </FieldWrapper>
          );
        }

        // ── ZodTuple ─────────────────────────────────────────────────────────
        if (tn === 'ZodTuple') {
          const tupleItems: ZodTypeAny[] = (inner as any)._def.items;
          const tupleVal: any[] = val ?? tupleItems.map(() => undefined);
          const setTupleItem = (i: number, v: any) => {
            const next = [...tupleVal];
            next[i] = v;
            set(next);
          };
          return (
            <div key={key} className="zf-section">
              <div className="zf-section-header">
                <span className="zf-section-label">{label}</span>
                {optional && <span className="zf-badge zf-badge--optional">optional</span>}
              </div>
              {description && <p className="zf-description">{description}</p>}
              <div className="zf-nested">
                {tupleItems.map((itemSchema, i) => {
                  const { inner: iInner } = unwrap(itemSchema);
                  const itn = typeName(iInner);
                  const iLabel = `Item ${i + 1}`;
                  return (
                    <FieldWrapper key={i} label={iLabel}>
                      {itn === 'ZodString' && (
                        <StringField
                          schema={iInner}
                          value={tupleVal[i]}
                          onChange={(v) => setTupleItem(i, v)}
                        />
                      )}
                      {itn === 'ZodNumber' && (
                        <NumberField
                          schema={iInner}
                          value={tupleVal[i]}
                          onChange={(v) => setTupleItem(i, v)}
                        />
                      )}
                      {itn === 'ZodBoolean' && (
                        <BooleanField value={tupleVal[i]} onChange={(v) => setTupleItem(i, v)} />
                      )}
                      {!['ZodString', 'ZodNumber', 'ZodBoolean'].includes(itn) && (
                        <span className="zf-unsupported">{itn}</span>
                      )}
                    </FieldWrapper>
                  );
                })}
              </div>
            </div>
          );
        }

        // ── Fallback ─────────────────────────────────────────────────────────
        return (
          <FieldWrapper
            key={key}
            label={label}
            description={description}
            optional={optional}
          >
            <div className="zf-unsupported" title={tn}>
              <span>Not yet supported:</span> <code>{tn}</code>
            </div>
          </FieldWrapper>
        );
      })}
    </>
  );
}

// ── ZodForm (public API) ──────────────────────────────────────────────────────

export interface ZodFormProps {
  /** The Zod schema — should be a ZodObject at the top level */
  schema: ZodTypeAny;
  /** Current field values */
  model: Record<string, any>;
  /** Optional per-field config for labels, descriptions, and custom renderers */
  config?: FormConfig;
  /** Called when the user submits the form */
  onSubmit: (data: Record<string, any>) => void;
  /** Called on every field change (for live preview) */
  onChangeModel?: (data: Record<string, any>) => void;
  /** Submit button text */
  submitLabel?: string;
  /** Whether the submit button shows a loading state */
  isSubmitting?: boolean;
}

export function ZodForm({
  schema,
  model,
  config,
  onSubmit,
  onChangeModel,
  submitLabel = 'Save changes',
  isSubmitting = false,
}: ZodFormProps) {
  const [values, setValues] = useState<Record<string, any>>(model ?? {});

  const handleChange = useCallback(
    (next: Record<string, any>) => {
      setValues(next);
      onChangeModel?.(next);
    },
    [onChangeModel],
  );

  const { inner } = unwrap(schema);
  const tn = typeName(inner);

  if (tn !== 'ZodObject') {
    return (
      <div className="zf-error">
        <strong>Configuration error:</strong> The block schema must be a{' '}
        <code>z.object(&#123;...&#125;)</code> at the top level.
      </div>
    );
  }

  return (
    <form
      className="zf-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
      noValidate
    >
      <div className="zf-fields">
        <ObjectFields
          schema={inner}
          value={values}
          onChange={handleChange}
          config={config}
          depth={0}
          idPrefix="zf-root"
        />
      </div>

      <div className="zf-actions">
        <button type="submit" className="zf-btn zf-btn--primary" disabled={isSubmitting}>
          <IconSave />
          {isSubmitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
