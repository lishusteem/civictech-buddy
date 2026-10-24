'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState, type ReactNode } from 'react';

const icon = (path: ReactNode) => (
  <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {path}
  </svg>
);

const OPTIONS = [
  {
    value: 'light',
    label: 'Luminos',
    icon: icon(
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>,
    ),
  },
  { value: 'dark', label: 'Întunecat', icon: icon(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />) },
  {
    value: 'system',
    label: 'Ca sistemul',
    icon: icon(
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8M12 16v4" />
      </>,
    ),
  },
] as const;

/** Three-way theme switch. The theme is only known in the browser, so it renders after mount. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div role="radiogroup" aria-label="Tema" className={`inline-flex rounded-lg border border-line bg-surface-2 p-0.5 ${className}`}>
      {OPTIONS.map((o) => {
        const checked = mounted && theme === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={checked}
            title={o.label}
            onClick={() => setTheme(o.value)}
            className={`flex h-7 w-8 items-center justify-center rounded-md focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus ${
              checked ? 'bg-surface text-fg shadow-card' : 'text-fg-subtle hover:text-fg'
            }`}
          >
            {o.icon}
            <span className="sr-only">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
