import { humanize, pluralize, slugify } from "@/lib/utils";
import {
  ACTION_TYPES,
  ConfigIssue,
  FIELD_TYPES,
  isActionType,
  isFieldType,
  isTriggerType,
  isViewType,
  isWidgetType,
  NormalizeResult,
  NormalizedAction,
  NormalizedConfig,
  NormalizedEntity,
  NormalizedField,
  NormalizedView,
  NormalizedWidget,
  NormalizedWorkflow,
} from "./schema";

const DEFAULT_PRIMARY = "#4f46e5";

/** Make a JSON-key / URL-safe identifier without destroying author intent. */
function toIdentifier(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^A-Za-z0-9_]/g, "");
}

function asString(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => asString(v))
    .filter((v): v is string => typeof v === "string" && v.length > 0);
}

function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  if (value === "true") return true;
  if (value === "false") return false;
  return fallback;
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Normalize untrusted JSON into a NormalizedConfig.
 * Never throws — structural problems are downgraded and reported as issues.
 */
export function normalizeConfig(raw: unknown): NormalizeResult {
  const issues: ConfigIssue[] = [];
  const add = (level: ConfigIssue["level"], path: string, message: string) =>
    issues.push({ level, path, message });

  const root: Record<string, unknown> = isPlainObject(raw) ? raw : {};
  if (!isPlainObject(raw)) {
    add(
      "error",
      "$",
      "Top-level config is not an object. Falling back to an empty app.",
    );
  }

  const name = asString(root.name)?.trim() || "Untitled App";
  if (!asString(root.name)) {
    add("warning", "name", 'Missing "name". Defaulted to "Untitled App".');
  }

  const description = asString(root.description)?.trim() || undefined;

  const themeRaw = isPlainObject(root.theme) ? root.theme : {};
  let primaryColor = DEFAULT_PRIMARY;
  if (themeRaw.primaryColor !== undefined) {
    if (isHexColor(themeRaw.primaryColor)) {
      primaryColor = themeRaw.primaryColor;
    } else {
      add(
        "warning",
        "theme.primaryColor",
        `Invalid color "${String(themeRaw.primaryColor)}". Using default.`,
      );
    }
  }

  // ---- Entities ----
  const entities: NormalizedEntity[] = [];
  const seenEntityNames = new Set<string>();
  const rawEntities = Array.isArray(root.entities) ? root.entities : [];
  if (root.entities !== undefined && !Array.isArray(root.entities)) {
    add("error", "entities", '"entities" must be an array. Ignored.');
  }

  rawEntities.forEach((rawEntity, i) => {
    const path = `entities[${i}]`;
    if (!isPlainObject(rawEntity)) {
      add("error", path, "Entity is not an object. Skipped.");
      return;
    }
    const rawName = asString(rawEntity.name);
    if (!rawName) {
      add("error", `${path}.name`, "Entity is missing a name. Skipped.");
      return;
    }
    let key = toIdentifier(rawName);
    if (!key) {
      add(
        "error",
        `${path}.name`,
        `Entity name "${rawName}" has no usable characters. Skipped.`,
      );
      return;
    }
    if (seenEntityNames.has(key)) {
      const deduped = `${key}_${i}`;
      add(
        "warning",
        `${path}.name`,
        `Duplicate entity "${key}" renamed to "${deduped}".`,
      );
      key = deduped;
    }
    seenEntityNames.add(key);

    const fields = normalizeFields(rawEntity.fields, `${path}.fields`, add);
    if (fields.length === 0) {
      add("warning", `${path}.fields`, `Entity "${key}" has no valid fields.`);
    }

    const label = asString(rawEntity.label)?.trim() || humanize(rawName);
    const labelPlural =
      asString(rawEntity.labelPlural)?.trim() || pluralize(label);

    // Pick a sensible title field.
    let displayField = asString(rawEntity.displayField);
    if (displayField && !fields.some((f) => f.name === displayField)) {
      add(
        "warning",
        `${path}.displayField`,
        `displayField "${displayField}" is not a field. Auto-selecting.`,
      );
      displayField = undefined;
    }
    if (!displayField) {
      const textLike = fields.find((f) =>
        ["text", "email", "url"].includes(f.type),
      );
      displayField = textLike?.name ?? fields[0]?.name ?? "";
    }

    entities.push({
      name: key,
      label,
      labelPlural,
      icon: asString(rawEntity.icon)?.trim() || undefined,
      displayField,
      fields,
    });
  });

  // ---- Views ----
  const views = normalizeViews(root.views, entities, add);

  // ---- Workflows ----
  const workflows = normalizeWorkflows(root.workflows, entities, add);

  const config: NormalizedConfig = {
    name,
    description,
    theme: { primaryColor },
    entities,
    views,
    workflows,
  };

  return {
    config,
    issues,
    hasErrors: issues.some((x) => x.level === "error"),
    hasWarnings: issues.some((x) => x.level === "warning"),
  };
}

function normalizeFields(
  raw: unknown,
  basePath: string,
  add: (level: ConfigIssue["level"], path: string, message: string) => void,
): NormalizedField[] {
  if (raw !== undefined && !Array.isArray(raw)) {
    add("error", basePath, '"fields" must be an array. Ignored.');
    return [];
  }
  const rawFields = Array.isArray(raw) ? raw : [];
  const fields: NormalizedField[] = [];
  const seen = new Set<string>();

  rawFields.forEach((rawField, i) => {
    const path = `${basePath}[${i}]`;
    if (!isPlainObject(rawField)) {
      add("error", path, "Field is not an object. Skipped.");
      return;
    }
    const rawName = asString(rawField.name);
    if (!rawName) {
      add("error", `${path}.name`, "Field is missing a name. Skipped.");
      return;
    }
    const key = toIdentifier(rawName);
    if (!key) {
      add("error", `${path}.name`, `Field name "${rawName}" is unusable. Skipped.`);
      return;
    }
    if (seen.has(key)) {
      add("warning", `${path}.name`, `Duplicate field "${key}" skipped.`);
      return;
    }
    seen.add(key);

    // Resolve type, degrading unknown types to "text".
    let type: NormalizedField["type"] = "text";
    let unknownType: string | undefined;
    if (rawField.type === undefined) {
      add(
        "warning",
        `${path}.type`,
        `Field "${key}" has no type. Defaulted to "text".`,
      );
    } else if (isFieldType(rawField.type)) {
      type = rawField.type;
    } else {
      unknownType = String(rawField.type);
      add(
        "warning",
        `${path}.type`,
        `Unknown field type "${unknownType}". Rendering as text. Supported: ${FIELD_TYPES.join(", ")}.`,
      );
    }

    const options = asStringArray(rawField.options);
    if ((type === "select" || type === "multiselect") && options.length === 0) {
      add(
        "warning",
        `${path}.options`,
        `Field "${key}" is a ${type} but has no options.`,
      );
    }

    const min = typeof rawField.min === "number" ? rawField.min : undefined;
    const max = typeof rawField.max === "number" ? rawField.max : undefined;

    fields.push({
      name: key,
      label: asString(rawField.label)?.trim() || humanize(rawName),
      type,
      required: asBool(rawField.required),
      options,
      placeholder: asString(rawField.placeholder)?.trim() || undefined,
      helpText: asString(rawField.helpText)?.trim() || undefined,
      defaultValue: rawField.defaultValue,
      min,
      max,
      unknownType,
    });
  });

  return fields;
}

function normalizeViews(
  raw: unknown,
  entities: NormalizedEntity[],
  add: (level: ConfigIssue["level"], path: string, message: string) => void,
): NormalizedView[] {
  if (raw !== undefined && !Array.isArray(raw)) {
    add("error", "views", '"views" must be an array. Ignored.');
    return [];
  }
  const rawViews = Array.isArray(raw) ? raw : [];
  const views: NormalizedView[] = [];
  const ids = new Set<string>();

  const uniqueId = (base: string, i: number) => {
    let id = slugify(base) || `view-${i}`;
    while (ids.has(id)) id = `${id}-${i}`;
    ids.add(id);
    return id;
  };

  rawViews.forEach((rawView, i) => {
    const path = `views[${i}]`;
    if (!isPlainObject(rawView)) {
      add("error", path, "View is not an object. Skipped.");
      return;
    }
    const title = asString(rawView.title)?.trim();
    const typeValue = rawView.type;

    if (!isViewType(typeValue)) {
      // Keep it so the renderer can show a graceful fallback card.
      const unknownType = asString(typeValue) ?? "undefined";
      add(
        "warning",
        `${path}.type`,
        `Unknown view type "${unknownType}". It will render as a fallback.`,
      );
      views.push({
        id: uniqueId(title || `view-${i}`, i),
        type: "table", // placeholder; unknownType signals fallback rendering
        title: title || "Unsupported view",
        unknownType,
      });
      return;
    }

    if (typeValue === "table") {
      const entityName = asString(rawView.entity);
      const entity = entities.find((e) => e.name === entityName);
      if (!entity) {
        add(
          "error",
          `${path}.entity`,
          `Table view references unknown entity "${entityName ?? ""}". Skipped.`,
        );
        return;
      }
      let columns = asStringArray(rawView.columns);
      const known = new Set(entity.fields.map((f) => f.name));
      const badColumns = columns.filter((c) => !known.has(c));
      if (badColumns.length) {
        add(
          "warning",
          `${path}.columns`,
          `Unknown columns ignored: ${badColumns.join(", ")}.`,
        );
        columns = columns.filter((c) => known.has(c));
      }
      if (columns.length === 0) columns = entity.fields.map((f) => f.name);
      views.push({
        id: uniqueId(title || entity.labelPlural, i),
        type: "table",
        title: title || entity.labelPlural,
        entity: entity.name,
        columns,
      });
      return;
    }

    // dashboard
    const widgets = normalizeWidgets(rawView.widgets, entities, `${path}.widgets`, add);
    views.push({
      id: uniqueId(title || "Dashboard", i),
      type: "dashboard",
      title: title || "Dashboard",
      widgets,
    });
  });

  return views;
}

function normalizeWidgets(
  raw: unknown,
  entities: NormalizedEntity[],
  basePath: string,
  add: (level: ConfigIssue["level"], path: string, message: string) => void,
): NormalizedWidget[] {
  if (raw !== undefined && !Array.isArray(raw)) {
    add("warning", basePath, '"widgets" must be an array. Ignored.');
    return [];
  }
  const rawWidgets = Array.isArray(raw) ? raw : [];
  const widgets: NormalizedWidget[] = [];

  rawWidgets.forEach((rawWidget, i) => {
    const path = `${basePath}[${i}]`;
    if (!isPlainObject(rawWidget)) {
      add("warning", path, "Widget is not an object. Skipped.");
      return;
    }
    const entityName = asString(rawWidget.entity);
    const entity = entities.find((e) => e.name === entityName);
    if (!entity) {
      add(
        "warning",
        `${path}.entity`,
        `Widget references unknown entity "${entityName ?? ""}". Skipped.`,
      );
      return;
    }
    const title = asString(rawWidget.title)?.trim() || entity.labelPlural;

    if (!isWidgetType(rawWidget.type)) {
      widgets.push({
        type: "stat",
        title,
        entity: entity.name,
        metric: "count",
        unknownType: asString(rawWidget.type) ?? "undefined",
      });
      add(
        "warning",
        `${path}.type`,
        `Unknown widget type "${String(rawWidget.type)}". Rendering as a count.`,
      );
      return;
    }

    widgets.push({
      type: rawWidget.type,
      title,
      entity: entity.name,
      metric: asString(rawWidget.metric) || "count",
      field: asString(rawWidget.field) || undefined,
      limit: typeof rawWidget.limit === "number" ? rawWidget.limit : 5,
    });
  });

  return widgets;
}

function normalizeWorkflows(
  raw: unknown,
  entities: NormalizedEntity[],
  add: (level: ConfigIssue["level"], path: string, message: string) => void,
): NormalizedWorkflow[] {
  if (raw !== undefined && !Array.isArray(raw)) {
    add("error", "workflows", '"workflows" must be an array. Ignored.');
    return [];
  }
  const rawWorkflows = Array.isArray(raw) ? raw : [];
  const workflows: NormalizedWorkflow[] = [];

  rawWorkflows.forEach((rawWf, i) => {
    const path = `workflows[${i}]`;
    if (!isPlainObject(rawWf)) {
      add("error", path, "Workflow is not an object. Skipped.");
      return;
    }
    const triggerRaw = isPlainObject(rawWf.trigger) ? rawWf.trigger : {};
    if (!isTriggerType(triggerRaw.type)) {
      add(
        "error",
        `${path}.trigger.type`,
        `Unknown trigger "${String(triggerRaw.type)}". Workflow skipped.`,
      );
      return;
    }
    const entityName = asString(triggerRaw.entity);
    const entity = entities.find((e) => e.name === entityName);
    if (!entity) {
      add(
        "error",
        `${path}.trigger.entity`,
        `Workflow trigger references unknown entity "${entityName ?? ""}". Skipped.`,
      );
      return;
    }

    const actions = normalizeActions(rawWf.actions, entity, `${path}.actions`, add);

    workflows.push({
      id: slugify(asString(rawWf.name) || `workflow-${i}`) || `workflow-${i}`,
      name: asString(rawWf.name)?.trim() || `Workflow ${i + 1}`,
      enabled: asBool(rawWf.enabled, true),
      trigger: { type: triggerRaw.type, entity: entity.name },
      actions,
    });
  });

  return workflows;
}

function normalizeActions(
  raw: unknown,
  entity: NormalizedEntity,
  basePath: string,
  add: (level: ConfigIssue["level"], path: string, message: string) => void,
): NormalizedAction[] {
  const rawActions = Array.isArray(raw) ? raw : [];
  const actions: NormalizedAction[] = [];

  rawActions.forEach((rawAction, i) => {
    const path = `${basePath}[${i}]`;
    if (!isPlainObject(rawAction)) {
      add("warning", path, "Action is not an object. Skipped.");
      return;
    }
    if (!isActionType(rawAction.type)) {
      add(
        "warning",
        `${path}.type`,
        `Unknown action "${String(rawAction.type)}". Skipped. Supported: ${ACTION_TYPES.join(", ")}.`,
      );
      return;
    }
    const type = rawAction.type;
    if (type === "setField") {
      const field = asString(rawAction.field);
      if (!field || !entity.fields.some((f) => f.name === field)) {
        add(
          "warning",
          `${path}.field`,
          `setField references unknown field "${field ?? ""}". Skipped.`,
        );
        return;
      }
      actions.push({ type, field, value: rawAction.value });
      return;
    }
    if (type === "webhook") {
      const url = asString(rawAction.url);
      if (!url) {
        add("warning", `${path}.url`, "webhook action missing url. Skipped.");
        return;
      }
      actions.push({ type, url });
      return;
    }
    // log | notify
    actions.push({
      type,
      message: asString(rawAction.message) || `${entity.label} ${type}`,
    });
  });

  return actions;
}
