'use client';

import type { CSSProperties } from 'react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// Neo-brutal toasts: ink border, hard offset shadow, flat colour per type.
// `!` is needed because sonner ships its own (more specific) default styles.
const toastBase =
  '!rounded-md !border-[3px] !border-ink !font-sans !font-bold !text-[#111] !shadow-[5px_5px_0_var(--shadow-color)]';

function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="system"
      className="toaster group"
      style={{ '--normal-bg': 'var(--yellow)', '--normal-text': '#111', '--normal-border': 'var(--line)' } as CSSProperties}
      toastOptions={{
        classNames: {
          toast: toastBase,
          title: '!font-display !uppercase !tracking-wide',
          description: '!text-[#111] !font-medium',
          success: '!bg-mint',
          error: '!bg-pink',
          warning: '!bg-yellow',
          info: '!bg-[#8fb4ff]',
          actionButton: '!rounded-md !border-2 !border-[#111] !bg-[#111] !text-white !font-bold',
          cancelButton: '!rounded-md !border-2 !border-[#111] !bg-white !text-[#111] !font-bold',
          closeButton: '!border-2 !border-[#111] !bg-white !text-[#111]',
        },
      }}
      {...props}
    />
  );
}

export { Toaster, Toaster as Sonner };
