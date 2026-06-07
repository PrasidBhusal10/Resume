import { cn } from "@/lib/utils";

type Variant = "default" | "success" | "warning" | "error" | "brand" | "outline";

const variants: Record<Variant, string> = {
  default:  "bg-slate-100 text-slate-600",
  success:  "bg-green-50 text-green-700 border border-green-200",
  warning:  "bg-yellow-50 text-yellow-700 border border-yellow-200",
  error:    "bg-red-50 text-red-600 border border-red-200",
  brand:    "bg-brand-50 text-brand-700 border border-brand-100",
  outline:  "border border-slate-200 text-slate-600 bg-white",
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium",
        variants[variant],
        className
      )}>
      {children}
    </span>
  );
}
