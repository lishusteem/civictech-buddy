// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import { KeepLinks } from './KeepLinks';

describe('KeepLinks on the server', () => {
  // A brand-new project opens on KeepLinks, so the editor page server-renders it.
  it('renders without window, with relative links until hydration', () => {
    const html = renderToString(<KeepLinks slug="s" editToken="tok" projectName="P" published={false} onDone={() => {}} />);
    expect(html).toContain('/e/tok');
    expect(html).toContain('Păstrează-ți linkurile');
  });
});
