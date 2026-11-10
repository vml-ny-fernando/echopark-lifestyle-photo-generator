import { Baby } from 'lucide-react';

import { countFigures, type Figure } from '../../shared/scene.ts';
import styles from './FigureIcons.module.css';

/*
 * Full-height pictograms, drawn here because lucide has no standing man or
 * woman. Flat fills on a 16-wide grid; heights follow the figure (an adult
 * stands taller than a child). The baby comes from lucide; the solid paw
 * print (a dog) is drawn here to match the fills.
 */

function Man() {
  return (
    <svg viewBox="0 0 16 32" width={14} height={28} fill="currentColor">
      <circle cx="8" cy="4" r="3" />
      <path d="M5 9h6a2 2 0 0 1 2 2v8h-2v11H9v-9H7v9H5V19H3v-8a2 2 0 0 1 2-2z" />
    </svg>
  );
}

function Woman() {
  return (
    <svg viewBox="0 0 16 32" width={14} height={28} fill="currentColor">
      <circle cx="8" cy="4" r="3" />
      <path d="M6 9h4a2 2 0 0 1 1.9 1.4L14.5 21H11v9H9v-9H7v9H5v-9H1.5l2.6-10.6A2 2 0 0 1 6 9z" />
    </svg>
  );
}

/** Someone the brief doesn't gender. */
function Adult() {
  return (
    <svg viewBox="0 0 16 32" width={14} height={28} fill="currentColor">
      <circle cx="8" cy="4" r="3" />
      <rect x="4" y="9" width="8" height="21" rx="4" />
    </svg>
  );
}

/** An EchoPark Experience Guide: a figure wearing a lanyard badge. */
function Guide() {
  return (
    <svg viewBox="0 0 16 32" width={14} height={28} fill="currentColor">
      <circle cx="8" cy="4" r="3" />
      <path
        fillRule="evenodd"
        d="M8 9a4 4 0 0 1 4 4v13a4 4 0 0 1-8 0V13a4 4 0 0 1 4-4zM6 15h4v3H6z"
      />
    </svg>
  );
}

/** A dog: a solid paw print, four toes over a pad. */
function Paw() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} fill="currentColor">
      <ellipse cx="4.3" cy="10.4" rx="2.3" ry="2.9" transform="rotate(-20 4.3 10.4)" />
      <ellipse cx="8.7" cy="5.1" rx="2.4" ry="3.1" transform="rotate(-8 8.7 5.1)" />
      <ellipse cx="15.3" cy="5.1" rx="2.4" ry="3.1" transform="rotate(8 15.3 5.1)" />
      <ellipse cx="19.7" cy="10.4" rx="2.3" ry="2.9" transform="rotate(20 19.7 10.4)" />
      <path d="M12 11.6c-2.6 0-4.4 2.3-5.9 4.4-1.3 1.8-2.4 3.3-1.4 5 .9 1.5 2.7 1.6 4.4 1.1 1.1-.3 2-.6 2.9-.6s1.8.3 2.9.6c1.7.5 3.5.4 4.4-1.1 1-1.7-.1-3.2-1.4-5-1.5-2.1-3.3-4.4-5.9-4.4z" />
    </svg>
  );
}

function Child() {
  return (
    <svg viewBox="0 0 16 22" width={12} height={18} fill="currentColor">
      <circle cx="8" cy="4.5" r="3.5" />
      <rect x="4.5" y="9.5" width="7" height="12.5" rx="3.5" />
    </svg>
  );
}

function FigureIcon({ figure }: { figure: Figure }) {
  switch (figure) {
    case 'man':
      return <Man />;
    case 'woman':
      return <Woman />;
    case 'adult':
      return <Adult />;
    case 'guide':
      return <Guide />;
    case 'child':
      return <Child />;
    case 'baby':
      return <Baby size={18} strokeWidth={2.25} />;
    case 'dog':
      return <Paw />;
  }
}

/**
 * Who a scenario calls for: one icon per kind of figure, each with how many.
 * Decorative; pair it with `figurePhrase()` for screen readers.
 */
export function FigureIcons({ who }: { who: readonly Figure[] }) {
  return (
    <span className={styles.row}>
      {countFigures(who).map(({ figure, count }) => (
        <span key={figure} className={styles.figure}>
          <FigureIcon figure={figure} />
          <span className={styles.count}>{count}</span>
        </span>
      ))}
    </span>
  );
}
