"use client";

import { HelpCircle } from "lucide-react";
import {
  findEntity,
  NormalizedConfig,
  NormalizedView,
} from "@/lib/config/schema";
import { Card, EmptyState } from "@/components/ui";
import { ErrorBoundary } from "./error-boundary";
import { Widget } from "./widgets";

/** Graceful fallback for view types the runtime doesn't know how to render. */
function FallbackView({ title, type }: { title: string; type: string }) {
  return (
    <Card className="flex items-start gap-3 p-4">
      <HelpCircle className="mt-0.5 h-5 w-5 text-amber-500" />
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="mt-0.5 text-xs text-muted">
          Unsupported view type “{type}”. This view is shown as a placeholder so
          the rest of the app keeps working.
        </p>
      </div>
    </Card>
  );
}

/**
 * Dispatches a normalized view to its renderer. Each dashboard widget is
 * isolated in an error boundary so one bad widget can't take down the page.
 */
export function DynamicView({
  appId,
  config,
  view,
}: {
  appId: string;
  config: NormalizedConfig;
  view: NormalizedView;
}) {
  if (view.unknownType) {
    return <FallbackView title={view.title} type={view.unknownType} />;
  }

  if (view.type === "dashboard") {
    const widgets = view.widgets ?? [];
    if (widgets.length === 0) {
      return (
        <EmptyState
          title="Empty dashboard"
          description="This dashboard view has no widgets configured."
        />
      );
    }
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {widgets.map((widget, i) => {
          const entity = findEntity(config, widget.entity);
          if (!entity) return null;
          return (
            <ErrorBoundary key={i} label={widget.title}>
              <Widget appId={appId} entity={entity} widget={widget} />
            </ErrorBoundary>
          );
        })}
      </div>
    );
  }

  return null; // table views are rendered by the entity runner page
}
