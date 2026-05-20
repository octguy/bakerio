import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import type { HTMLAttributes } from "react";

const badgeVariants = cva("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", {
  variants: {
    variant: {
      default: "bg-brand-100 text-brand-800",
      success: "bg-green-100 text-green-800",
      warning: "bg-yellow-100 text-yellow-800",
      destructive: "bg-red-100 text-red-800",
      secondary: "bg-gray-100 text-gray-800",
    },
  },
  defaultVariants: { variant: "default" },
});

export function Badge({ className, variant, ...props }: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
