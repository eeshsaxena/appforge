"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { ClientError } from "@/lib/client";
import { normalizeConfig } from "@/lib/config/normalize";
import { useCreateApp } from "@/lib/hooks";
import { BLANK_CONFIG, TEMPLATES } from "@/lib/templates";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

const OPTIONS = [
  { id: "blank", name: "Blank app", description: "Start from an empty config.", config: BLANK_CONFIG },
  ...TEMPLATES,
];

export default function NewAppPage() {
  const router = useRouter();
  const create = useCreateApp();
  const [selected, setSelected] = useState("crm");
  const [name, setName] = useState("");

  const option = OPTIONS.find((o) => o.id === selected) ?? OPTIONS[0];
  const preview = useMemo(() => normalizeConfig(option.config), [option]);
  const effectiveName =
    name.trim() || (option.config.name as string) || "My App";

  async function onCreate() {
    try {
      const config = { ...option.config, name: effectiveName };
      const { app } = await create.mutateAsync({
        name: effectiveName,
        description: (option.config.description as string) || undefined,
        config,
      });
      toast.success("App created");
      router.push(`/apps/${app.id}`);
    } catch (err) {
      toast.error(
        err instanceof ClientError ? err.message : "Failed to create app",
      );
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to apps
      </Link>

      <h1 className="text-xl font-semibold">Create a new app</h1>
      <p className="text-sm text-muted">
        Pick a starting point. You can edit the JSON config anytime.
      </p>

      <div className="mt-5">
        <Label htmlFor="app-name">App name</Label>
        <Input
          id="app-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={effectiveName}
        />
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const result = normalizeConfig(opt.config);
          const active = selected === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setSelected(opt.id)}
              className={cn(
                "relative rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-[var(--brand)] bg-indigo-50/40 ring-1 ring-[var(--brand)]"
                  : "border-border bg-surface hover:bg-slate-50",
              )}
            >
              {active && (
                <span className="absolute right-3 top-3 grid h-5 w-5 place-items-center rounded-full bg-[var(--brand)] text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <p className="font-medium">{opt.name}</p>
              <p className="mt-1 text-sm text-muted">{opt.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <Badge>{result.config.entities.length} entities</Badge>
                {result.issues.length > 0 && (
                  <Badge tone="amber">{result.issues.length} issues</Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-muted">
          Selected: <span className="font-medium text-foreground">{option.name}</span>
          {preview.issues.length > 0 && " (includes intentional config issues)"}
        </p>
        <Button onClick={onCreate} loading={create.isPending}>
          Create app
        </Button>
      </div>
    </div>
  );
}
