import type { SplitEngineId, SplitResult } from '@/lib/types';

export type Step = 'upload' | 'review' | 'assign' | 'result';

/** Review-step item: money kept as strings for smooth editing. */
export interface DraftItem {
  id: string;
  name: string;
  unitPrice: string;
  qty: string;
  lineTotal: string;
  lowConfidence?: boolean;
}

export interface DraftTotals {
  subtotal: string;
  tax: string;
  service: string;
  tip: string;
  extras: string;
  discount: string;
  grandTotal: string;
}

export interface RosterPerson {
  id: string;
  name: string;
  color?: string | null;
}
export interface RosterPreset {
  id: string;
  name: string;
  memberIds: string[];
}

export interface ComputeResponse {
  result: SplitResult;
  verification: {
    reconciles: boolean;
    perPersonConsistent: boolean;
    match: boolean;
  } | null;
}

export interface FlowState {
  step: Step;
  engine: SplitEngineId;
  blobUrl: string | null;
  previewUrl: string | null;
  title: string;
  items: DraftItem[];
  totals: DraftTotals;
  /** itemId -> set of participant names sharing it */
  assignments: Record<string, string[]>;
  /** participant names on the bill with no items assigned */
  extras: string[];
  result: SplitResult | null;
  verification: ComputeResponse['verification'];
}

export const EMPTY_TOTALS: DraftTotals = {
  subtotal: '',
  tax: '',
  service: '',
  tip: '',
  extras: '',
  discount: '',
  grandTotal: '',
};
