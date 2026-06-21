"use client";

import { useParams } from "next/navigation";
import { Activity, CheckCircle2, XCircle } from "lucide-react";
import { useAppDetail } from "@/components/app-context";
import { useRuns } from "@/lib/hooks";
import { Badge, Card, EmptyState, Skeleton } from "@/components/ui";

export default function ActivityPage() {
  const params = useParams<{ appId: string }>();
  const { normalized } = useAppDetail();
  const { data: runs, isLoading } = useRuns(params.appId);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold">Workflow activity</h2>
        <p className="text-xs text-muted">
          {normalized.workflows.length} workflow
          {normalized.workflows.length === 1 ? "" : "s"} configured. Runs are
          recorded automatically when records are created, updated, or deleted.
        </p>
      </div>

      {isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}

      {runs && runs.length === 0 && (
        <EmptyState
          icon={<Activity className="h-10 w-10" />}
          title="No activity yet"
          description="Create, edit, or delete records to trigger workflows."
        />
      )}

      {runs?.map((run) => (
        <Card key={run.id} className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {run.status === "success" ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">{run.workflowName}</span>
              <Badge>{run.trigger}</Badge>
              <Badge tone="brand">{run.entity}</Badge>
            </div>
            <span className="text-xs text-muted">
              {new Date(run.createdAt).toLocaleString()}
            </span>
          </div>
          {run.logs.length > 0 && (
            <ul className="mt-3 space-y-1 border-t border-border pt-2 text-xs">
              {run.logs.map((log, i) => (
                <li key={i} className="flex gap-2">
                  <span
                    className={
                      log.status === "error"
                        ? "font-medium text-red-600"
                        : "font-medium text-muted"
                    }
                  >
                    {log.action}
                  </span>
                  <span className="text-foreground">{log.message}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}
    </div>
  );
}
