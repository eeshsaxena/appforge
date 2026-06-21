import { prisma } from "@/lib/db";
import {
  NormalizedConfig,
  NormalizedEntity,
  TriggerType,
} from "@/lib/config/schema";
import type { Prisma } from "@prisma/client";

interface WorkflowContext {
  appId: string;
  entity: NormalizedEntity;
  trigger: TriggerType;
  /** The record's current data (after the triggering mutation). */
  record: Record<string, unknown>;
  recordId?: string;
}

interface ActionLog {
  action: string;
  status: "ok" | "error";
  message: string;
}

/** Replace {{field}} tokens in a string with values from the record. */
function interpolate(template: string, record: Record<string, unknown>): string {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key: string) => {
    const value = record[key];
    if (value === undefined || value === null) return "";
    return Array.isArray(value) ? value.join(", ") : String(value);
  });
}

/**
 * Run all workflows matching the trigger. Executes AFTER the DB mutation.
 *
 * Design notes:
 * - Each run is recorded in WorkflowRun for an auditable activity feed.
 * - `setField` writes back to the record directly (no re-trigger) to avoid
 *   infinite loops, and is skipped on delete triggers.
 * - One failing action does not abort the others; it's logged as an error.
 */
export async function runWorkflows(
  config: NormalizedConfig,
  ctx: WorkflowContext,
): Promise<void> {
  const matching = config.workflows.filter(
    (w) =>
      w.enabled &&
      w.trigger.type === ctx.trigger &&
      w.trigger.entity === ctx.entity.name,
  );
  if (matching.length === 0) return;

  for (const workflow of matching) {
    const logs: ActionLog[] = [];
    let status: "success" | "error" = "success";
    let record = { ...ctx.record };

    for (const action of workflow.actions) {
      try {
        switch (action.type) {
          case "log":
          case "notify": {
            logs.push({
              action: action.type,
              status: "ok",
              message: interpolate(action.message ?? "", record),
            });
            break;
          }
          case "setField": {
            if (!action.field) break;
            if (ctx.trigger === "record.deleted" || !ctx.recordId) {
              logs.push({
                action: "setField",
                status: "ok",
                message: `Skipped setField "${action.field}" (no live record).`,
              });
              break;
            }
            const value =
              typeof action.value === "string"
                ? interpolate(action.value, record)
                : action.value;
            record = { ...record, [action.field]: value };
            // Direct update — intentionally does NOT re-run workflows.
            await prisma.record.update({
              where: { id: ctx.recordId },
              data: { data: record as Prisma.InputJsonValue },
            });
            logs.push({
              action: "setField",
              status: "ok",
              message: `Set ${action.field} = ${JSON.stringify(value)}`,
            });
            break;
          }
          case "webhook": {
            if (!action.url) break;
            const res = await fetch(action.url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                trigger: ctx.trigger,
                entity: ctx.entity.name,
                recordId: ctx.recordId,
                record,
              }),
              signal: AbortSignal.timeout(5000),
            });
            logs.push({
              action: "webhook",
              status: res.ok ? "ok" : "error",
              message: `POST ${action.url} -> ${res.status}`,
            });
            if (!res.ok) status = "error";
            break;
          }
        }
      } catch (err) {
        status = "error";
        logs.push({
          action: action.type,
          status: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Audit every run. Never let logging failures break the request.
    try {
      await prisma.workflowRun.create({
        data: {
          appId: ctx.appId,
          workflowId: workflow.id,
          workflowName: workflow.name,
          trigger: ctx.trigger,
          entity: ctx.entity.name,
          recordId: ctx.recordId,
          status,
          logs: logs as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      console.error("[workflows] failed to persist run:", err);
    }
  }
}
