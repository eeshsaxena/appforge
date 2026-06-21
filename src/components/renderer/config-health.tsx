"use client";

import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { ConfigIssue } from "@/lib/config/schema";
import { Badge } from "@/components/ui";

/** Surfaces the issues collected by the config normalizer. */
export function ConfigHealth({ issues }: { issues: ConfigIssue[] }) {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  if (issues.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
        <CheckCircle2 className="h-4 w-4" />
        Config is healthy — no issues found.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-surface">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2 text-sm">
        <span className="font-medium">Config health</span>
        {errors.length > 0 && (
          <Badge tone="red">
            {errors.length} error{errors.length > 1 ? "s" : ""}
          </Badge>
        )}
        {warnings.length > 0 && (
          <Badge tone="amber">
            {warnings.length} warning{warnings.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>
      <ul className="max-h-60 divide-y divide-border overflow-auto text-sm">
        {issues.map((issue, idx) => (
          <li key={idx} className="flex items-start gap-2 px-3 py-2">
            {issue.level === "error" ? (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
            ) : (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            )}
            <div className="min-w-0">
              <code className="text-xs text-muted">{issue.path}</code>
              <p className="break-words">{issue.message}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
