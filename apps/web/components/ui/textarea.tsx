import * as React from 'react';
import { cn } from '@/lib/utils';

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn('flex min-h-36 w-full rounded-md border-[2.5px] border-ink bg-card px-3 py-2 text-base text-foreground shadow-[3px_3px_0_var(--shadow-color)] outline-none transition-shadow placeholder:text-muted-foreground focus-visible:shadow-[5px_5px_0_var(--primary)] disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} />
));
Textarea.displayName = 'Textarea';

export { Textarea };
