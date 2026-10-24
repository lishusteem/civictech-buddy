'use client';

import { useEffect, useState } from 'react';
import type { StepId } from '@/lib/project/schema';
import { waitTips } from '@/lib/steps/waitTips';

/** How long each idea stays on screen: long enough to read two lines. */
export const TIP_MS = 6000;

/**
 * Ideas about structuring impact, one at a time, while the AI works. Kept out of the live region,
 * so screen readers hear the status line once instead of every tip.
 */
export function WaitTips({ step }: { step: StepId }) {
  const tips = waitTips(step);
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % tips.length), TIP_MS);
    return () => clearInterval(id);
  }, [tips.length]);

  return (
    <div className="mt-2 border-t border-dashed border-line pt-2 text-sm text-fg-muted" aria-hidden="true">
      <span className="font-medium text-accent">Între timp · </span>
      <span key={i} className="motion-safe:animate-[fadein_400ms_ease-out]">
        {tips[i]}
      </span>
      <span className="mt-1 block text-xs text-fg-subtle">
        {i + 1} / {tips.length}
      </span>
    </div>
  );
}
