import { cn } from '@/lib/utils';

/** The split-receipt mark — two receipt halves pulling apart. Inline SVG so it
 *  adapts to light/dark via CSS vars. Matches public/icons/icon.svg. */
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
      {/* left half */}
      <g>
        <polygon
          points="66.1,147.0 214.9,128.7 241.5,345.1 225.3,367.3 204.3,349.7 188.1,371.8 167.1,354.3 150.9,376.4 129.8,358.8 113.7,381.0 92.6,363.4 66.1,147.0"
          fill="var(--accent)"
        />
        <g stroke="var(--surface)" strokeWidth="14" strokeLinecap="round">
          <line x1="96.5" y1="197.7" x2="201.7" y2="184.8" />
          <line x1="102.1" y1="243.4" x2="207.3" y2="230.4" />
          <line x1="107.7" y1="289.0" x2="212.9" y2="276.1" />
        </g>
        <line
          x1="113.0"
          y1="332.7"
          x2="190.5"
          y2="323.2"
          stroke="#D9A521"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <g fill="#D9A521">
          <circle cx="216.6" cy="142.6" r="7" />
          <circle cx="220.3" cy="172.4" r="7" />
          <circle cx="224.0" cy="202.2" r="7" />
          <circle cx="227.6" cy="232.0" r="7" />
          <circle cx="231.3" cy="261.7" r="7" />
          <circle cx="234.9" cy="291.5" r="7" />
          <circle cx="238.6" cy="321.3" r="7" />
        </g>
      </g>
      {/* right half */}
      <g>
        <polygon
          points="445.9,147.0 297.1,128.7 270.5,345.1 286.7,367.3 307.7,349.7 323.9,371.8 344.9,354.3 361.1,376.4 382.2,358.8 398.3,381.0 419.4,363.4 445.9,147.0"
          fill="var(--accent)"
        />
        <g stroke="var(--surface)" strokeWidth="14" strokeLinecap="round">
          <line x1="415.5" y1="197.7" x2="310.3" y2="184.8" />
          <line x1="409.9" y1="243.4" x2="304.7" y2="230.4" />
          <line x1="404.3" y1="289.0" x2="299.1" y2="276.1" />
        </g>
        <line
          x1="399.0"
          y1="332.7"
          x2="321.5"
          y2="323.2"
          stroke="#D9A521"
          strokeWidth="20"
          strokeLinecap="round"
        />
        <g fill="#D9A521">
          <circle cx="295.4" cy="142.6" r="7" />
          <circle cx="291.7" cy="172.4" r="7" />
          <circle cx="288.0" cy="202.2" r="7" />
          <circle cx="284.4" cy="232.0" r="7" />
          <circle cx="280.7" cy="261.7" r="7" />
          <circle cx="277.1" cy="291.5" r="7" />
          <circle cx="273.4" cy="321.3" r="7" />
        </g>
      </g>
    </svg>
  );
}
