import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 appearance-none items-center justify-center gap-2 whitespace-nowrap rounded-md border-[3px] border-ink font-display text-sm uppercase tracking-wide shadow-[5px_5px_0_var(--shadow-color)] transition-[transform,box-shadow] duration-100 hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[2px_2px_0_var(--shadow-color)] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        ghost: 'border-transparent bg-transparent text-foreground shadow-none hover:translate-x-0 hover:translate-y-0 hover:border-ink hover:bg-muted hover:shadow-none',
        outline: 'bg-card text-foreground',
        destructive: 'bg-destructive text-destructive-foreground',
        link: 'h-auto rounded-none border-0 bg-transparent p-0 font-sans font-bold normal-case tracking-normal text-primary shadow-none underline underline-offset-4 hover:translate-x-0 hover:translate-y-0 hover:shadow-none',
      },
      size: {
        sm: 'min-h-9 px-3',
        md: 'min-h-11 px-4',
        lg: 'min-h-[52px] px-6',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
