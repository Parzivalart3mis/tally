/** Fixed palette for person avatars/chips. Stored as the id (e.g. 'rose'). */
export const PERSON_COLORS = [
  { id: 'rose', hex: '#F43F5E' },
  { id: 'orange', hex: '#F97316' },
  { id: 'amber', hex: '#D9A521' },
  { id: 'emerald', hex: '#10B981' },
  { id: 'teal', hex: '#0F766E' },
  { id: 'sky', hex: '#0EA5E9' },
  { id: 'violet', hex: '#8B5CF6' },
  { id: 'slate', hex: '#64748B' },
] as const;

export type PersonColorId = (typeof PERSON_COLORS)[number]['id'];

export const PERSON_COLOR_IDS = PERSON_COLORS.map((c) => c.id) as [
  PersonColorId,
  ...PersonColorId[],
];

/** Map a stored color id to a hex; falls back to the accent CSS var. */
export function colorHex(id?: string | null): string {
  return PERSON_COLORS.find((c) => c.id === id)?.hex ?? 'var(--accent)';
}
