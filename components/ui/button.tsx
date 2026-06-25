import Link from "next/link";
import type { CSSProperties, ComponentPropsWithoutRef, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  variant?: "primary" | "secondary" | "ghost";
  isLoading?: boolean;
};

const variants = {
  primary:
    "bg-[var(--color-ink)] text-[var(--color-surface)] hover:bg-ink/90 active:bg-ink/80 disabled:bg-ink/35",
  secondary:
    "border border-rule bg-surface text-ink hover:border-accent/50 hover:bg-accent-soft active:bg-muted disabled:text-ink-soft",
  ghost: "text-ink hover:bg-muted active:bg-accent-soft disabled:text-ink-soft"
};

export function Button({
  children,
  className,
  disabled,
  isLoading = false,
  style,
  variant = "primary",
  ...props
}: ButtonProps) {
  const primaryStyle: CSSProperties =
    variant === "primary"
      ? {
          background: "var(--color-ink)",
          color: "var(--color-surface)",
          ...style
        }
      : style ?? {};

  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-4 text-sm font-semibold transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:cursor-not-allowed",
        variants[variant],
        className
      )}
      disabled={disabled || isLoading}
      style={primaryStyle}
      {...props}
    >
      {isLoading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  className,
  href,
  children,
  style,
  variant = "primary",
  ...props
}: {
  className?: string;
  href: string;
  children: ReactNode;
  variant?: ButtonProps["variant"];
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className" | "children">) {
  const primaryStyle: CSSProperties =
    variant === "primary"
      ? {
          background: "var(--color-ink)",
          color: "var(--color-surface)",
          ...style
        }
      : style ?? {};

  return (
    <Link
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-sm font-semibold transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper",
        variants[variant],
        className
      )}
      href={href}
      style={primaryStyle}
      {...props}
    >
      {children}
    </Link>
  );
}
