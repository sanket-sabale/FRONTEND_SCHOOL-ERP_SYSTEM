import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

type CommonButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
  variant?: ButtonVariant;
  loading?: boolean;
  selected?: boolean;
  disabled?: boolean;
};

type IconButtonProps = CommonButtonProps & {
  size: "icon";
  children: ReactNode;
} & (
    | { "aria-label": string; "aria-labelledby"?: string }
    | { "aria-label"?: string; "aria-labelledby": string }
  );

type TextButtonProps = CommonButtonProps & {
  size?: Exclude<ButtonSize, "icon">;
  children: ReactNode;
};

export type ButtonProps = IconButtonProps | TextButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border border-primary bg-primary text-primary-foreground shadow-sm hover:brightness-95 active:brightness-90",
  secondary:
    "border border-border bg-surface text-foreground shadow-sm hover:bg-surface-muted active:brightness-95",
  outline:
    "border border-border-strong bg-transparent text-foreground hover:bg-surface-muted active:brightness-95",
  ghost:
    "border border-transparent bg-transparent text-foreground-muted hover:bg-surface-muted hover:text-foreground active:brightness-95",
  destructive:
    "border border-danger bg-danger text-white shadow-sm hover:brightness-95 active:brightness-90",
  link:
    "border border-transparent bg-transparent px-0 text-primary underline-offset-4 hover:underline active:brightness-90",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-2.5 text-xs",
  md: "h-9 px-3 text-sm",
  lg: "h-10 px-4 text-sm",
  icon: "h-9 w-9 p-0",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = "primary",
      size = "md",
      loading = false,
      selected = false,
      disabled = false,
      type = "button",
      "aria-busy": ariaBusy,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        aria-busy={ariaBusy ?? (loading || undefined)}
        aria-pressed={selected || undefined}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-medium leading-none transition-colors duration-150",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-55",
          "motion-reduce:transition-none",
          variantClasses[variant],
          sizeClasses[size],
          selected && "ring-2 ring-sky-200 dark:ring-sky-900",
          className,
        )}
        disabled={isDisabled}
        ref={ref}
        type={type}
        {...props}
      >
        {loading ? (
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          />
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";
