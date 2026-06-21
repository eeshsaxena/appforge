"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Code2,
  LayoutDashboard,
  Table,
  Upload,
} from "lucide-react";
import { useApp } from "@/lib/hooks";
import { ClientError } from "@/lib/client";
import { AppProvider } from "@/components/app-context";
import { Button, Card, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils";

export default function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ appId: string }>();
  const appId = params.appId;
  const pathname = usePathname();
  const { data, isLoading, isError, error } = useApp(appId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    const notFound = error instanceof ClientError && error.status === 404;
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <AlertCircle className="h-8 w-8 text-red-500" />
        <p className="font-medium">
          {notFound ? "App not found" : "Failed to load app"}
        </p>
        <p className="max-w-sm text-sm text-muted">
          {error instanceof ClientError
            ? error.message
            : "Please try again."}
        </p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4" />
            Back to apps
          </Button>
        </Link>
      </Card>
    );
  }

  const { app, normalized } = data;
  const base = `/apps/${appId}`;

  const navItems = [
    { href: base, label: "Overview", icon: LayoutDashboard, exact: true },
    ...normalized.entities.map((e) => ({
      href: `${base}/e/${e.name}`,
      label: e.labelPlural,
      icon: Table,
      exact: false,
    })),
    { href: `${base}/builder`, label: "Builder", icon: Code2, exact: false },
    { href: `${base}/activity`, label: "Activity", icon: Activity, exact: false },
    { href: `${base}/export`, label: "Export", icon: Upload, exact: false },
  ];

  return (
    <AppProvider value={data}>
      <div className="mb-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Apps
        </Link>
        <h1 className="mt-2 text-xl font-semibold">{app.name}</h1>
        {app.description && (
          <p className="text-sm text-muted">{app.description}</p>
        )}
      </div>

      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border">
        {navItems.map((item) => {
          const active = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "border-[var(--brand)] text-[var(--brand)]"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </AppProvider>
  );
}
