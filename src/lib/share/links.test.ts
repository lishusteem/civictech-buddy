import { describe, expect, it } from 'vitest';
import { buildShareMessage, gmailComposeUrl, mailtoUrl } from './links';

const links = {
  publicUrl: 'https://example.org/p/' + 'a'.repeat(78),
  editUrl: 'https://example.org/e/' + 'b'.repeat(78),
  projectName: 'Proiect',
};

describe('share links', () => {
  it('keeps subject + body within 1500 chars for worst-case input', () => {
    const m = buildShareMessage({
      publicUrl: 'p'.repeat(100),
      editUrl: 'e'.repeat(100),
      projectName: 'n'.repeat(300),
    });
    expect(m.subject.length + m.body.length).toBeLessThanOrEqual(1500);
  });

  it('truncates the name in the subject to 80 chars', () => {
    const m = buildShareMessage({ ...links, projectName: 'n'.repeat(300) });
    expect(m.subject).toBe('Linkurile proiectului ' + 'n'.repeat(80));
  });

  it('lays out the body on separate lines', () => {
    expect(buildShareMessage(links).body.split('\n')).toEqual([
      'Pagina publică (o poți da oricui):',
      links.publicUrl,
      '',
      'Linkul de editare (păstrează-l doar pentru echipă; nu poate fi recuperat):',
      links.editUrl,
    ]);
  });

  it('builds a gmail compose url', () => {
    const u = gmailComposeUrl(buildShareMessage(links));
    expect(u.startsWith('https://mail.google.com/mail/?view=cm&fs=1&su=')).toBe(true);
    expect(u).toContain('su=Linkurile%20proiectului');
  });

  it('builds a mailto url', () => {
    expect(mailtoUrl(buildShareMessage(links))).toMatch(/^mailto:\?subject=.+&body=/);
  });

  it('does not throw when an emoji straddles the truncation point', () => {
    const m = buildShareMessage({ ...links, projectName: 'n'.repeat(79) + '🚧' });
    expect(() => gmailComposeUrl(m)).not.toThrow();
    expect(() => mailtoUrl(m)).not.toThrow();
  });
});
