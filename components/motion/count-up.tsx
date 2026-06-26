'use client';

import { useEffect, useState } from 'react';
import { animate, useReducedMotion } from 'framer-motion';
import { formatCents } from '@/lib/money';

/** Counts up to a cent value when it mounts/changes; static under reduced motion. */
export function CountUpCents({
  value,
  currency = 'USD',
  className,
}: {
  value: number;
  currency?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = useState(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration: 0.6,
      ease: 'easeOut',
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value, reduce]);

  return (
    <span className={className}>{formatCents(Math.round(display), currency)}</span>
  );
}
