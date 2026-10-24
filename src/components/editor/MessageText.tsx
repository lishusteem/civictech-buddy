import { Fragment, type ReactNode } from 'react';

const BULLET = /^\s*(?:[-•*]|\d+[.)])\s+/;

/** **bold** inside a line; everything else stays plain text. */
function inline(line: string): ReactNode {
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4 ? <strong key={i}>{part.slice(2, -2)}</strong> : <Fragment key={i}>{part}</Fragment>,
  );
}

/**
 * An AI message, made readable: blank lines split paragraphs, "- " / "1. " lines become lists.
 * Only formatting; the stored text is unchanged.
 */
export function MessageText({ text }: { text: string }) {
  const blocks = text.trim().split(/\n\s*\n/);
  return (
    <>
      {blocks.map((block, b) => {
        const lines = block.split('\n').filter((l) => l.trim() !== '');
        const bullets = lines.filter((l) => BULLET.test(l));
        if (bullets.length >= 2 && bullets.length >= lines.length - 1) {
          const lead = BULLET.test(lines[0]) ? null : lines[0];
          const ordered = /^\s*\d/.test(bullets[0]);
          const List = ordered ? 'ol' : 'ul';
          return (
            <div key={b} className={b > 0 ? 'mt-3' : undefined}>
              {lead && <p>{inline(lead)}</p>}
              <List className={`${lead ? 'mt-1 ' : ''}space-y-1 pl-5 ${ordered ? 'list-decimal' : 'list-disc'}`}>
                {bullets.map((l, i) => (
                  <li key={i}>{inline(l.replace(BULLET, ''))}</li>
                ))}
              </List>
            </div>
          );
        }
        return (
          <p key={b} className={`whitespace-pre-wrap ${b > 0 ? 'mt-3' : ''}`}>
            {inline(block)}
          </p>
        );
      })}
    </>
  );
}
