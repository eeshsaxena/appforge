"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppDetail } from "@/components/app-context";
import { ConfigHealth } from "@/components/renderer/config-health";
import { ClientError } from "@/lib/client";
import { normalizeConfig } from "@/lib/config/normalize";
import { useUpdateApp } from "@/lib/hooks";
import { Button, Card } from "@/components/ui";

export default function BuilderPage() {
  const params = useParams<{ appId: string }>();
  const { app } = useAppDetail();
  const update = useUpdateApp(params.appId);

  const [text, setText] = useState(() => JSON.stringify(app.config, null, 2));

  const parsed = useMemo(() => {
    try {
      return { value: JSON.parse(text) as unknown, error: null as string | null };
    } catch (e) {
      return {
        value: null,
        error: e instanceof Error ? e.message : "Invalid JSON",
      };
    }
  }, [text]);

  const health = useMemo(
    () => (parsed.value !== null ? normalizeConfig(parsed.value) : null),
    [parsed.value],
  );

  async function onSave() {
    if (parsed.value === null) {
      toast.error("Fix the JSON syntax before saving.");
      return;
    }
    const name =
      typeof (parsed.value as { name?: unknown }).name === "string"
        ? ((parsed.value as { name: string }).name)
        : undefined;
    try {
      await update.mutateAsync({ config: parsed.value, name });
      toast.success("Configuration saved");
    } catch (err) {
      toast.error(err instanceof ClientError ? err.message : "Save failed");
    }
  }

  function onFormat() {
    if (parsed.value !== null) setText(JSON.stringify(parsed.value, null, 2));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">App configuration (JSON)</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onFormat}
              disabled={parsed.value === null}
            >
              Format
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              loading={update.isPending}
              disabled={parsed.value === null}
            >
              Save
            </Button>
          </div>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          className="h-[60vh] w-full resize-none rounded-xl border border-border bg-surface p-3 font-mono text-xs leading-relaxed text-foreground focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20"
        />
        {parsed.error && (
          <p className="mt-2 text-xs text-red-600">JSON error: {parsed.error}</p>
        )}
      </div>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Live config health</h2>
        {health ? (
          <ConfigHealth issues={health.issues} />
        ) : (
          <Card className="border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Cannot validate — the JSON is invalid.
          </Card>
        )}
        {health && (
          <Card className="p-3 text-sm">
            <p className="font-medium">{health.config.name}</p>
            <p className="mt-0.5 text-xs text-muted">
              {health.config.entities.length} entities ·{" "}
              {health.config.views.length} views ·{" "}
              {health.config.workflows.length} workflows
            </p>
          </Card>
        )}
        <p className="text-xs text-muted">
          Tip: changes here are validated instantly. Save to apply them to the
          live app — the renderer always degrades gracefully on bad config.
        </p>
      </div>
    </div>
  );
}
