import { z } from "zod";
import { NormalizedEntity, NormalizedField } from "./schema";

/**
 * Build a Zod schema for a record of `entity` AT RUNTIME from its field config.
 * This is what makes the backend "dynamic": the same code validates records for
 * any app/entity, with rules derived from the (already normalized) config.
 *
 * - `partial: true` makes every field optional (used for PATCH-style updates).
 * - Empty strings are treated as "absent" so optional fields don't fail.
 * - Unknown keys not declared as fields are stripped (z.object default).
 */

const emptyToUndefined = (v: unknown) =>
  v === "" || v === null ? undefined : v;

function baseSchema(field: NormalizedField): z.ZodTypeAny {
  switch (field.type) {
    case "number": {
      let s = z.coerce.number();
      if (typeof field.min === "number")
        s = s.min(field.min, `${field.label} must be ≥ ${field.min}`);
      if (typeof field.max === "number")
        s = s.max(field.max, `${field.label} must be ≤ ${field.max}`);
      return s;
    }
    case "boolean":
      return z.coerce.boolean();
    case "email":
      return z.string().email(`${field.label} must be a valid email`);
    case "url":
      return z.string().url(`${field.label} must be a valid URL`);
    case "date":
    case "datetime":
      return z
        .string()
        .refine((v) => !Number.isNaN(Date.parse(v)), {
          message: `${field.label} must be a valid date`,
        });
    case "select":
      return field.options.length > 0
        ? z.enum(field.options as [string, ...string[]])
        : z.string();
    case "multiselect": {
      const item =
        field.options.length > 0
          ? z.enum(field.options as [string, ...string[]])
          : z.string();
      return z.array(item);
    }
    case "text":
    case "textarea":
    default:
      return z.string();
  }
}

function fieldSchema(field: NormalizedField, partial: boolean): z.ZodTypeAny {
  // Checkboxes are always present; missing means "false".
  if (field.type === "boolean") {
    return z.preprocess(
      (v) => (v === undefined || v === null || v === "" ? false : v),
      z.coerce.boolean(),
    );
  }

  if (field.type === "multiselect") {
    const pre = z.preprocess(
      (v) =>
        v === undefined || v === null || v === ""
          ? undefined
          : Array.isArray(v)
            ? v
            : [v], // lenient: wrap a single value into an array
      baseSchema(field).optional(),
    );
    if (field.required && !partial) {
      return pre.refine((v) => Array.isArray(v) && v.length > 0, {
        message: `${field.label} is required`,
      });
    }
    return pre;
  }

  const optionalized = z.preprocess(emptyToUndefined, baseSchema(field).optional());
  if (field.required && !partial) {
    return optionalized.refine((v) => v !== undefined, {
      message: `${field.label} is required`,
    });
  }
  return optionalized;
}

export function buildRecordSchema(
  entity: NormalizedEntity,
  opts: { partial?: boolean } = {},
) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const field of entity.fields) {
    shape[field.name] = fieldSchema(field, Boolean(opts.partial));
  }
  return z.object(shape);
}

export interface RecordValidationResult {
  success: boolean;
  data?: Record<string, unknown>;
  fieldErrors: Record<string, string[]>;
  formErrors: string[];
}

/** Validate an untrusted record body against an entity, returning a flat error map. */
export function validateRecord(
  entity: NormalizedEntity,
  body: unknown,
  opts: { partial?: boolean } = {},
): RecordValidationResult {
  const schema = buildRecordSchema(entity, opts);
  const result = schema.safeParse(
    body && typeof body === "object" ? body : {},
  );

  if (result.success) {
    return {
      success: true,
      data: result.data as Record<string, unknown>,
      fieldErrors: {},
      formErrors: [],
    };
  }

  const fieldErrors: Record<string, string[]> = {};
  const formErrors: string[] = [];
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") {
      (fieldErrors[key] ??= []).push(issue.message);
    } else {
      formErrors.push(issue.message);
    }
  }
  return { success: false, fieldErrors, formErrors };
}
