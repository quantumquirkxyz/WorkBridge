import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', {
  variants: {
    tone: {
      neutral: 'border-border bg-muted text-foreground',
      success: 'border-success bg-background text-success',
      warning: 'border-warning bg-background text-warning',
      danger: 'border-danger bg-background text-danger',
      accent: 'border-coral-ink bg-coral-tint text-coral-ink',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
