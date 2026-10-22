import type { Contact } from './publicPage';

const STYLE = {
  primary: 'inline-block rounded-lg bg-teal-800 px-5 py-2.5 font-medium text-white hover:bg-teal-900',
  outline: 'inline-block rounded-lg border border-teal-800 px-5 py-2.5 font-medium text-teal-900 hover:bg-teal-50',
  inverse: 'inline-block rounded-lg bg-white px-5 py-2.5 font-medium text-teal-900 hover:bg-teal-50',
  text: 'font-medium text-teal-900 underline underline-offset-2',
} as const;

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800';

/** The contact as a button-like link (email, Discord, WhatsApp, other link) or as plain text with „Contact:”. */
export function ContactAction({ contact, variant }: { contact: Contact; variant: keyof typeof STYLE }) {
  if (contact.kind === 'text') {
    return (
      <span>
        <span className="font-medium">Contact:</span> <span className="break-words">{contact.text}</span>
      </span>
    );
  }
  return (
    <a
      href={contact.href}
      className={`${STYLE[variant]} ${FOCUS}`}
      {...(contact.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {contact.label}
    </a>
  );
}
