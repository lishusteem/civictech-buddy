'use client';

import { ThemeProvider as NextThemes } from 'next-themes';
import type { ReactNode } from 'react';

/** Light, dark, or the system's; stored in this browser only (localStorage), never with the project. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
