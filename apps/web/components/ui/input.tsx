import * as React from 'react';
import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn('flex min-h-11 w-full rounded-md border-[2.5px] border-ink bg-card px-3 py-2 text-base text-foreground shadow-[3px_3px_0_var(--shadow-color)] outline-none transition-shadow placeholder:text-muted-foreground focus-visible:shadow-[5px_5px_0_var(--primary)] disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
));
Input.displayName = 'Input';

export { Input };
