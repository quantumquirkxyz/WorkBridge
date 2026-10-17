'use client';

import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';

const ToggleGroup = ToggleGroupPrimitive.Root;
const ToggleGroupItem = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Item>, React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>>(({ className, ...props }, ref) => <ToggleGroupPrimitive.Item ref={ref} className={cn('inline-flex min-h-11 items-center justify-center rounded-md border-2 border-ink px-3 text-sm font-bold hover:bg-muted data-[state=on]:bg-yellow data-[state=on]:text-ink data-[state=on]:shadow-[3px_3px_0_var(--shadow-color)]', className)} {...props} />);
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
