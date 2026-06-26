'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { Receipt } from 'lucide-react';
import { BillCard, type BillCardData } from './bill-card';

export function HistoryList({ bills }: { bills: BillCardData[] }) {
  const reduce = useReducedMotion();

  if (bills.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-border bg-surface/50 px-6 py-14 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-surface-2 text-text-hint">
          <Receipt className="size-6" />
        </span>
        <p className="font-medium text-text">No bills yet.</p>
        <p className="text-sm text-text-muted">Start your first split.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
      {bills.map((bill, i) => (
        <motion.div
          key={bill.id}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: reduce ? 0 : i * 0.05, duration: 0.25 }}
        >
          <BillCard bill={bill} />
        </motion.div>
      ))}
    </div>
  );
}
