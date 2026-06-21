"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAppDetail } from "@/components/app-context";
import { ClientError } from "@/lib/client";
import { useExportGithub } from "@/lib/hooks";
import {
  Button,
  Card,
  FieldError,
  Input,
  Label,
} from "@/components/ui";

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.05-.02-2.06-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.39 1.24-3.23-.12-.3-.54-1.53.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.23 0 4.63-2.81 5.65-5.49 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.22.7.83.58A12.01 12.01 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z" />
    </svg>
  );
}

export default function ExportPage() {
  const params = useParams<{ appId: string }>();
  const { app } = useAppDetail();
  const exportGh = useExportGithub(params.appId);

  const [token, setToken] = useState("");
  const [repoName, setRepoName] = useState(app.slug);
  const [isPrivate, setIsPrivate] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [resultUrl, setResultUrl] = useState<string | null>(null);

  async function onExport(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setResultUrl(null);
    try {
      const { url } = await exportGh.mutateAsync({
        token: token || undefined,
        repoName,
        private: isPrivate,
      });
      setResultUrl(url);
      toast.success("Exported to GitHub");
    } catch (err) {
      if (err instanceof ClientError) {
        setErrors(err.details?.fieldErrors ?? {});
        toast.error(err.message);
      } else {
        toast.error("Export failed");
      }
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center gap-2">
          <Download className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold">Download config</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Export the raw app configuration as a JSON file. Re-import it anytime
          to recreate the app.
        </p>
        <a
          href={`/api/apps/${params.appId}/export`}
          download
          className="mt-4 inline-block"
        >
          <Button variant="outline">
            <Download className="h-4 w-4" />
            Download {app.slug}.appforge.json
          </Button>
        </a>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <GithubIcon className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-semibold">Export to GitHub</h2>
        </div>
        <p className="mt-1 text-sm text-muted">
          Creates a new repository with <code>appforge.json</code> and a
          generated <code>README.md</code>.
        </p>

        <form onSubmit={onExport} className="mt-4 space-y-4">
          <div>
            <Label htmlFor="token" required>
              GitHub personal access token
            </Label>
            <Input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="ghp_…"
              autoComplete="off"
            />
            <p className="mt-1 text-xs text-muted">
              Needs the <code>repo</code> scope. The token is used for this
              request only and never stored.
            </p>
            <FieldError messages={errors.token} />
          </div>
          <div>
            <Label htmlFor="repoName" required>
              New repository name
            </Label>
            <Input
              id="repoName"
              value={repoName}
              onChange={(e) => setRepoName(e.target.value)}
            />
            <FieldError messages={errors.repoName} />
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-border text-[var(--brand)]"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
            />
            Make repository private
          </label>

          <Button type="submit" loading={exportGh.isPending}>
            <GithubIcon className="h-4 w-4" />
            Export to GitHub
          </Button>
        </form>

        {resultUrl && (
          <a
            href={resultUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-[var(--brand)]"
          >
            View repository
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </Card>
    </div>
  );
}
