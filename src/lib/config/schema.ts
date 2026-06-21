/**
 * The AppForge configuration model.
 *
 * A raw config is untrusted JSON authored by a user (or pasted from anywhere).
 * It may have missing fields, wrong types, unknown components, or duplicates.
 * `normalizeConfig` (see ./normalize.ts) turns any raw input into the
 * `NormalizedConfig` shape below, collecting warnings/errors instead of throwing.
 *
 * Everything downstream (renderer, APIs, validation, workflows) consumes the
 * NORMALIZED config only, so the rest of the system can assume a stable shape.
 */

export const FIELD_TYPES = [
  "text",
  "textarea",
  "number",
  "email",
  "url",
  "date",
  "datetime",
  "boolean",
  "select",
  "multiselect",
] as const;

export type FieldType = (typeof FIELD_TYPES)[number];

export const VIEW_TYPES = ["table", "dashboard"] as const;
export type ViewType = (typeof VIEW_TYPES)[number];

export const WIDGET_TYPES = ["stat", "list", "breakdown"] as const;
export type WidgetType = (typeof WIDGET_TYPES)[number];

export const TRIGGER_TYPES = [
  "record.created",
  "record.updated",
  "record.deleted",
] as const;
export type TriggerType = (typeof TRIGGER_TYPES)[number];

export const ACTION_TYPES = [
  "log",
  "setField",
  "webhook",
  "notify",
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface NormalizedField {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  placeholder?: string;
  helpText?: string;
  defaultValue?: unknown;
  min?: number;
  max?: number;
  /** When the author used a type we don't recognise, we degrade to "text"
   *  but remember the original so the UI can flag it. */
  unknownType?: string;
}

export interface NormalizedEntity {
  name: string; // canonical identifier used as the storage key
  label: string;
  labelPlural: string;
  icon?: string;
  /** Field whose value is used as a record's title in lists/links. */
  displayField: string;
  fields: NormalizedField[];
}

export interface NormalizedWidget {
  type: WidgetType;
  title: string;
  entity: string;
  /** For "stat": "count" | "sum:field" | "avg:field". For "breakdown": a field. */
  metric?: string;
  field?: string;
  limit?: number;
  unknownType?: string;
}

export interface NormalizedView {
  id: string;
  type: ViewType;
  title: string;
  entity?: string; // required for table
  columns?: string[]; // table columns
  widgets?: NormalizedWidget[]; // dashboard widgets
  unknownType?: string;
}

export interface NormalizedAction {
  type: ActionType;
  /** log/notify */
  message?: string;
  /** setField */
  field?: string;
  value?: unknown;
  /** webhook */
  url?: string;
  unknownType?: string;
}

export interface NormalizedWorkflow {
  id: string;
  name: string;
  enabled: boolean;
  trigger: { type: TriggerType; entity: string };
  actions: NormalizedAction[];
}

export interface NormalizedConfig {
  name: string;
  description?: string;
  theme: { primaryColor: string };
  entities: NormalizedEntity[];
  views: NormalizedView[];
  workflows: NormalizedWorkflow[];
}

export type IssueLevel = "error" | "warning";

export interface ConfigIssue {
  level: IssueLevel;
  /** Dotted path into the raw config, e.g. "entities[1].fields[0].type". */
  path: string;
  message: string;
}

export interface NormalizeResult {
  config: NormalizedConfig;
  issues: ConfigIssue[];
  /** Convenience flags derived from issues. */
  hasErrors: boolean;
  hasWarnings: boolean;
}

export function isFieldType(value: unknown): value is FieldType {
  return typeof value === "string" && (FIELD_TYPES as readonly string[]).includes(value);
}

export function isViewType(value: unknown): value is ViewType {
  return typeof value === "string" && (VIEW_TYPES as readonly string[]).includes(value);
}

export function isTriggerType(value: unknown): value is TriggerType {
  return typeof value === "string" && (TRIGGER_TYPES as readonly string[]).includes(value);
}

export function isActionType(value: unknown): value is ActionType {
  return typeof value === "string" && (ACTION_TYPES as readonly string[]).includes(value);
}

export function isWidgetType(value: unknown): value is WidgetType {
  return typeof value === "string" && (WIDGET_TYPES as readonly string[]).includes(value);
}

/** Find an entity by its canonical name. */
export function findEntity(
  config: NormalizedConfig,
  name: string | undefined,
): NormalizedEntity | undefined {
  if (!name) return undefined;
  return config.entities.find((e) => e.name === name);
}
