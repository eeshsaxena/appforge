"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Table } from "lucide-react";
import { useAppDetail } from "@/components/app-context";
import { ConfigHealth } from "@/components/renderer/config-health";
import { DynamicView } from "@/components/renderer/dynamic-view";
import { Card, EmptyState } from "@/components/ui";

export default function OverviewPage() {
  const params = useParams<{ appId: string }>();
  const { normalized, issues } = useAppDetail();

  const dashboards = normalized.views.filter(
    (v) => v.type === "dashboard" && !v.unknownType,
  );
  const unknownViews = normalized.views.filter((v) => v.unknownType);

  return (
    <div className="space-y-6">
      <ConfigHealth issues={issues} />

      {dashboards.map((view) => (
        <section key={view.id}>
          <h2 className="mb-3 text-sm font-semibold">{view.title}</h2>
          <DynamicView appId={params.appId} config={normalized} view={view} />
        </section>
      ))}

      {unknownViews.map((view) => (
        <DynamicView
          key={view.id}
          appId={params.appId}
          config={normalized}
          view={view}
        />
      ))}

      {dashboards.length === 0 &&
        (normalized.entities.length > 0 ? (
          <section>
            <h2 className="mb-3 text-sm font-semibold">Entities</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {normalized.entities.map((e) => (
                <Link key={e.name} href={`/apps/${params.appId}/e/${e.name}`}>
                  <Card className="p-4 transition-shadow hover:shadow-md">
                    <div className="flex items-center gap-2">
                      <Table className="h-4 w-4 text-muted" />
                      <span className="font-medium">{e.labelPlural}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {e.fields.length} fields
                    </p>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : (
          <EmptyState
            title="Empty app"
            description="No entities defined yet. Open the Builder to design your schema."
          />
        ))}
    </div>
  );
}
