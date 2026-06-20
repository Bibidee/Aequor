import { cn } from "@/lib/utils/cn";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "deep" | "cream" | "lime-accent";
  onClick?: () => void;
}

export function Card({ children, className, variant = "default", onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "border-2 border-ink",
        {
          "bg-panel-cream": variant === "default",
          "bg-deep-panel text-canvas": variant === "deep",
          "bg-canvas": variant === "cream",
          "bg-panel-cream border-l-4 border-l-signal-lime": variant === "lime-accent",
        },
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-4 py-3 border-b-2 border-ink", className)}>
      {children}
    </div>
  );
}

export function CardBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-4", className)}>{children}</div>;
}
