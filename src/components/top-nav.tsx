"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useLogout } from "@/lib/hooks";
import { SessionUser } from "@/lib/types";
import { Button } from "./ui";
import { Logo } from "./logo";

export function TopNav({ user }: { user: SessionUser }) {
  const router = useRouter();
  const logout = useLogout();

  async function signOut() {
    await logout.mutateAsync();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/dashboard">
          <Logo />
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted sm:inline">
            {user.name || user.email}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
            loading={logout.isPending}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}
