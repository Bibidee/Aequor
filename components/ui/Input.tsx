import { cn } from "@/lib/utils/cn";
import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-stamp font-bold uppercase tracking-widest text-muted-ink">{label}</label>}
      <input
        ref={ref}
        className={cn(
          "border-2 border-ink bg-canvas px-3 py-2 text-sm font-body text-ink outline-none focus:border-judgement-blue transition-colors placeholder:text-muted-ink",
          error && "border-danger-red",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger-red font-stamp">{error}</span>}
    </div>
  )
);
Input.displayName = "Input";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-stamp font-bold uppercase tracking-widest text-muted-ink">{label}</label>}
      <textarea
        ref={ref}
        className={cn(
          "border-2 border-ink bg-canvas px-3 py-2 text-sm font-body text-ink outline-none focus:border-judgement-blue transition-colors placeholder:text-muted-ink resize-none",
          error && "border-danger-red",
          className
        )}
        {...props}
      />
      {error && <span className="text-xs text-danger-red font-stamp">{error}</span>}
    </div>
  )
);
Textarea.displayName = "Textarea";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-stamp font-bold uppercase tracking-widest text-muted-ink">{label}</label>}
      <select
        className={cn(
          "border-2 border-ink bg-canvas px-3 py-2 text-sm font-body text-ink outline-none focus:border-judgement-blue transition-colors appearance-none",
          error && "border-danger-red",
          className
        )}
        {...props}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {error && <span className="text-xs text-danger-red font-stamp">{error}</span>}
    </div>
  );
}
