import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-sm border-2 border-ink px-2 py-0.5 text-xs font-bold uppercase tracking-wide', {
  variants: {
    tone: {
      neutral: 'bg-muted text-foreground',
      success: 'bg-mint text-[#111]',
      warning: 'bg-yellow text-[#111]',
      danger: 'bg-danger text-white dark:text-ink',
      accent: 'bg-pink text-[#111]',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, tone, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { Badge, badgeVariants };
