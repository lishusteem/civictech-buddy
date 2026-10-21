export type ShareLinks = { publicUrl: string; editUrl: string; projectName: string };
export type ShareMessage = { subject: string; body: string };

export function buildShareMessage(l: ShareLinks): ShareMessage {
  return {
    subject: `Linkurile proiectului ${Array.from(l.projectName).slice(0, 80).join('')}`,
    body: [
      'Pagina publică (o poți da oricui):',
      l.publicUrl,
      '',
      'Linkul de editare (păstrează-l doar pentru echipă; nu poate fi recuperat):',
      l.editUrl,
    ].join('\n'),
  };
}

export function gmailComposeUrl(m: ShareMessage): string {
  return `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
}

export function mailtoUrl(m: ShareMessage): string {
  return `mailto:?subject=${encodeURIComponent(m.subject)}&body=${encodeURIComponent(m.body)}`;
}
