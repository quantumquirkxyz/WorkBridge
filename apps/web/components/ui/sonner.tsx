'use client';

import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster(props: ToasterProps) {
  return <Sonner theme="system" className="toaster group" {...props} />;
}

export { Toaster, Toaster as Sonner };
