import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------- Button ------------------------------- */

type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--brand)] text-[var(--brand-foreground)] hover:opacity-90 shadow-sm",
  secondary: "bg-slate-900 text-white hover:bg-slate-800 shadow-sm",
  outline: "border border-border bg-surface text-foreground hover:bg-slate-50",
  ghost: "text-foreground hover:bg-slate-100",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = "primary", size = "md", loading, children, disabled, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  ),
);
Button.displayName = "Button";

/* ------------------------------- Inputs ------------------------------- */

const inputClass =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-slate-400 focus:border-[var(--brand)] focus:outline-none focus:ring-2 focus:ring-[var(--brand)]/20 disabled:opacity-60 aria-[invalid=true]:border-red-400";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input ref={ref} className={cn(inputClass, className)} {...props} />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(inputClass, "min-h-24", className)} {...props} />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, ...props }, ref) => (
  <select ref={ref} className={cn(inputClass, "pr-8", className)} {...props} />
));
Select.displayName = "Select";

/* ------------------------------- Labels ------------------------------- */

export function Label({
  className,
  required,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-foreground", className)}
      {...props}
    >
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

export function FieldError({ messages }: { messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return <p className="mt-1 text-xs text-red-600">{messages.join(" ")}</p>;
}

export function HelpText({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1 text-xs text-muted">{children}</p>;
}

/* ------------------------------- Surfaces ------------------------------- */

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

type BadgeTone = "neutral" | "brand" | "green" | "amber" | "red";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700",
  brand: "bg-indigo-50 text-indigo-700",
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: BadgeTone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

/* ------------------------------- Feedback ------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-5 w-5 animate-spin text-muted", className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-slate-200", className)} />;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface/50 px-6 py-12 text-center">
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
