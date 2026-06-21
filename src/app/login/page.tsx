"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ClientError } from "@/lib/client";
import { useLogin } from "@/lib/hooks";
import { Button, Card, FieldError, Input, Label } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  const router = useRouter();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    try {
      await login.mutateAsync({ email, password });
      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      if (err instanceof ClientError) {
        setErrors(err.details?.fieldErrors ?? {});
        toast.error(err.message);
      } else {
        toast.error("Something went wrong.");
      }
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo className="text-lg" />
        </div>
        <Card className="p-6">
          <h1 className="text-lg font-semibold">Sign in</h1>
          <p className="mt-1 text-sm text-muted">
            Welcome back. Sign in to your apps.
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="email" required>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <FieldError messages={errors.email} />
            </div>
            <div>
              <Label htmlFor="password" required>
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <FieldError messages={errors.password} />
            </div>
            <Button type="submit" className="w-full" loading={login.isPending}>
              Sign in
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          No account?{" "}
          <Link href="/signup" className="font-medium text-[var(--brand)]">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
