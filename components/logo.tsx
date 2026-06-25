import { cn } from '@/lib/utils';

/** The divided-coin mark, inline SVG so it inherits currentColor where useful.
 *  Matches public/icons/icon.svg. */
export function Logo({
  className,
  title = 'Tally',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={cn('size-8', className)}
      role="img"
      aria-label={title}
    >
      <circle cx="256" cy="256" r="179" fill="var(--surface)" />
      <path d="M256 256 L256 77 A179 179 0 0 1 411 345.5 Z" fill="#D9A521" />
      <g stroke="#D9A521" strokeWidth="12" strokeLinecap="round">
        <line x1="256" y1="256" x2="256" y2="77" />
        <line x1="256" y1="256" x2="411" y2="345.5" />
        <line x1="256" y1="256" x2="118.9" y2="371.1" />
        <line x1="256" y1="256" x2="101" y2="166.5" />
      </g>
      <circle
        cx="256"
        cy="256"
        r="179"
        fill="none"
        stroke="#D9A521"
        strokeWidth="25"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <Logo className="size-7" />
      <span className="text-lg font-semibold tracking-tight text-text">
        Tally
      </span>
    </span>
  );
}
