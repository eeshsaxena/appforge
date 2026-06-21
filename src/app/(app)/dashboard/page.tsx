"use client";

import Link from "next/link";
import { AlertCircle, Boxes, Database, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApps, useDeleteApp } from "@/lib/hooks";
import { ClientError } from "@/lib/client";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Skeleton,
} from "@/components/ui";

export default function DashboardPage() {
  const { data: apps, isLoading, isError, error } = useApps();
  const deleteApp = useDeleteApp();

  async function onDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}" and all its records? This cannot be undone.`))
      return;
    try {
      await deleteApp.mutateAsync(id);
      toast.success("App deleted");
    } catch (err) {
      toast.error(err instanceof ClientError ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your apps</h1>
          <p className="text-sm text-muted">
            Each app is generated from a JSON configuration.
          </p>
        </div>
        <Link href="/apps/new">
          <Button>
            <Plus className="h-4 w-4" />
            New app
          </Button>
        </Link>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="p-5">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
            </Card>
          ))}
        </div>
      )}

      {isError && (
        <Card className="flex items-center gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertCircle className="h-5 w-5" />
          {error instanceof ClientError ? error.message : "Failed to load apps."}
        </Card>
      )}

      {apps && apps.length === 0 && (
        <EmptyState
          icon={<Boxes className="h-10 w-10" />}
          title="No apps yet"
          description="Create your first app from a template or a blank config."
          action={
            <Link href="/apps/new">
              <Button>
                <Plus className="h-4 w-4" />
                New app
              </Button>
            </Link>
          }
        />
      )}

      {apps && apps.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <Card
              key={app.id}
              className="group relative flex flex-col p-5 transition-shadow hover:shadow-md"
            >
              <Link href={`/apps/${app.id}`} className="flex-1">
                <h2 className="font-semibold">{app.name}</h2>
                <p className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm text-muted">
                  {app.description || "No description"}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted">
                  <span className="inline-flex items-center gap-1">
                    <Boxes className="h-3.5 w-3.5" />
                    {app.entityCount} entities
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Database className="h-3.5 w-3.5" />
                    {app.recordCount} records
                  </span>
                  {app.issueCount > 0 && (
                    <Badge tone="amber">{app.issueCount} config issues</Badge>
                  )}
                </div>
              </Link>
              <button
                type="button"
                onClick={() => onDelete(app.id, app.name)}
                className="absolute right-3 top-3 rounded-md p-1.5 text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                aria-label="Delete app"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
