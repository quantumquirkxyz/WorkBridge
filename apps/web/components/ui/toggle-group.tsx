'use client';

import * as React from 'react';
import * as ToggleGroupPrimitive from '@radix-ui/react-toggle-group';
import { cn } from '@/lib/utils';

const ToggleGroup = ToggleGroupPrimitive.Root;
const ToggleGroupItem = React.forwardRef<React.ElementRef<typeof ToggleGroupPrimitive.Item>, React.ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item>>(({ className, ...props }, ref) => <ToggleGroupPrimitive.Item ref={ref} className={cn('inline-flex min-h-11 items-center justify-center rounded-xl px-3 text-sm font-semibold hover:bg-muted data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground', className)} {...props} />);
ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
