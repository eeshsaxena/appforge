"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ClientError } from "@/lib/client";
import { useSignup } from "@/lib/hooks";
import { Button, Card, FieldError, Input, Label } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function SignupPage() {
  const router = useRouter();
  const signup = useSignup();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    try {
      await signup.mutateAsync({ name: name || undefined, email, password });
      toast.success("Account created!");
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
          <h1 className="text-lg font-semibold">Create your account</h1>
          <p className="mt-1 text-sm text-muted">
            Start building config-driven apps.
          </p>
          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Optional"
              />
              <FieldError messages={errors.name} />
            </div>
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
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <FieldError messages={errors.password} />
              <p className="mt-1 text-xs text-muted">At least 8 characters.</p>
            </div>
            <Button type="submit" className="w-full" loading={signup.isPending}>
              Create account
            </Button>
          </form>
        </Card>
        <p className="mt-4 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-[var(--brand)]">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
