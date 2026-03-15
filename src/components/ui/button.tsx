import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-bold uppercase tracking-wider transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 rounded-none",
  {
    variants: {
      variant: {
        default:
          "border-2 border-border bg-primary text-primary-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5",
        destructive:
          "border-2 border-border bg-destructive text-destructive-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5",
        outline:
          "border-2 border-border bg-background text-foreground hover:bg-muted hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5",
        secondary:
          "border-2 border-border bg-secondary text-secondary-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5",
        ghost:
          "border-2 border-transparent text-foreground hover:border-border hover:bg-muted",
        link: "text-primary underline-offset-4 hover:underline border-0",
        accent:
          "border-2 border-border bg-accent text-accent-foreground hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10",
      },
      shadow: {
        none: "",
        sm: "[box-shadow:3px_3px_0_0_hsl(var(--border))] hover:[box-shadow:5px_5px_0_0_hsl(var(--border))] active:[box-shadow:1px_1px_0_0_hsl(var(--border))]",
        default: "[box-shadow:4px_4px_0_0_hsl(var(--border))] hover:[box-shadow:6px_6px_0_0_hsl(var(--border))] active:[box-shadow:1px_1px_0_0_hsl(var(--border))]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      shadow: "sm",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shadow, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, shadow, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
