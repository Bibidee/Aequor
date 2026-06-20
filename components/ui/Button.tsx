import { cn } from "@/lib/utils/cn";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "lime" | "outline";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-body font-semibold transition-all border-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-ink text-canvas border-ink hover:bg-deep-panel": variant === "primary",
            "bg-canvas text-ink border-ink hover:bg-panel-cream": variant === "secondary",
            "bg-transparent text-ink border-transparent hover:border-ink hover:bg-panel-cream": variant === "ghost",
            "bg-danger-red text-white border-danger-red hover:opacity-90": variant === "danger",
            "bg-signal-lime text-ink border-signal-lime hover:opacity-90": variant === "lime",
            "bg-transparent text-ink border-ink hover:bg-ink hover:text-canvas": variant === "outline",
            "px-3 py-1.5 text-sm": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-6 py-3 text-base": size === "lg",
          },
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
