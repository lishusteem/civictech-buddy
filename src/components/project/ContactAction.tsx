import type { Contact } from './publicPage';

const STYLE = {
  primary: 'inline-block rounded-lg bg-primary px-5 py-2.5 font-medium text-on-primary hover:bg-primary-hover',
  outline: 'inline-block rounded-lg border border-primary px-5 py-2.5 font-medium text-accent hover:bg-primary-soft',
  // On the footer's teal block; in dark the block is tinted, so the button is the filled primary.
  inverse: 'inline-block rounded-lg bg-surface px-5 py-2.5 font-medium text-accent hover:bg-primary-soft dark:bg-primary dark:text-on-primary dark:hover:bg-primary-hover',
  text: 'font-medium text-accent underline underline-offset-2',
} as const;

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus';

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
