import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from 'drizzle-orm/sqlite-core';
import { createId } from '@paralleldrive/cuid2';

export const SPLIT_ENGINE = ['CLAUDE_PROMPT', 'GROQ', 'EXACT_CODE'] as const;
export type SplitEngine = (typeof SPLIT_ENGINE)[number];

export const BILL_STATUS = ['DRAFT', 'COMPLETED'] as const;
export type BillStatus = (typeof BILL_STATUS)[number];

export const users = sqliteTable('users', {
  id: text('id').primaryKey(), // Clerk userId
  email: text('email').notNull().unique(),
  // which roster person is "me" — used to bold "your share" on a bill.
  selfPersonId: text('self_person_id'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const people = sqliteTable(
  'people',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color'), // optional palette token for chips/avatars
    note: text('note'), // optional nickname/note
    archived: integer('archived', { mode: 'boolean' })
      .notNull()
      .default(false), // soft delete
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => ({ userIdx: index('people_user_idx').on(t.userId) }),
);

export const presets = sqliteTable(
  'presets',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    memberIds: text('member_ids', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
  },
  (t) => ({ userIdx: index('presets_user_idx').on(t.userId) }),
);

export const bills = sqliteTable(
  'bills',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title'), // merchant or user-given
    status: text('status', { enum: BILL_STATUS }).notNull().default('DRAFT'),
    engine: text('engine', { enum: SPLIT_ENGINE })
      .notNull()
      .default('EXACT_CODE'),
    receiptImageUrl: text('receipt_image_url'), // Vercel Blob URL
    currency: text('currency').notNull().default('USD'),
    paidByName: text('paid_by_name'), // frozen name of who paid (optional)
    tags: text('tags', { mode: 'json' })
      .$type<string[]>()
      .notNull()
      .default([]),
    instructions: text('instructions'), // per-bill prompt for the AI engines

    // confirmed bill-level totals (stored in cents as integers)
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    taxCents: integer('tax_cents').notNull().default(0),
    serviceCents: integer('service_cents').notNull().default(0),
    tipCents: integer('tip_cents').notNull().default(0),
    extrasCents: integer('extras_cents').notNull().default(0),
    discountCents: integer('discount_cents').notNull().default(0),
    grandTotalCents: integer('grand_total_cents').notNull().default(0),
    sumCheckMatch: integer('sum_check_match', { mode: 'boolean' }),

    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date())
      .notNull(),
  },
  (t) => ({
    userStatusIdx: index('bills_user_status_idx').on(t.userId, t.status),
    userCreatedIdx: index('bills_user_created_idx').on(t.userId, t.createdAt),
  }),
);

// snapshot of who was on the bill — this is what survives a person being deleted
export const billParticipants = sqliteTable(
  'bill_participants',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    billId: text('bill_id')
      .notNull()
      .references(() => bills.id, { onDelete: 'cascade' }),
    personId: text('person_id').references(() => people.id, {
      onDelete: 'set null',
    }), // nullable on delete
    nameSnapshot: text('name_snapshot').notNull(), // frozen name, never changes
    subtotalCents: integer('subtotal_cents').notNull().default(0),
    taxExtrasCents: integer('tax_extras_cents').notNull().default(0),
    totalCents: integer('total_cents').notNull().default(0),
    centAdjustment: integer('cent_adjustment').notNull().default(0),
  },
  (t) => ({ billIdx: index('bp_bill_idx').on(t.billId) }),
);

export const billItems = sqliteTable(
  'bill_items',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    billId: text('bill_id')
      .notNull()
      .references(() => bills.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    unitPriceCents: integer('unit_price_cents').notNull(),
    qty: real('qty').notNull().default(1),
    lineTotalCents: integer('line_total_cents').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => ({ billIdx: index('bi_bill_idx').on(t.billId) }),
);

// which snapshot-participants share which item, with each one's share
export const itemAssignments = sqliteTable(
  'item_assignments',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => createId()),
    billItemId: text('bill_item_id')
      .notNull()
      .references(() => billItems.id, { onDelete: 'cascade' }),
    billParticipantId: text('bill_participant_id')
      .notNull()
      .references(() => billParticipants.id, { onDelete: 'cascade' }),
    shareCents: integer('share_cents').notNull(),
  },
  (t) => ({ itemIdx: index('ia_item_idx').on(t.billItemId) }),
);

export type User = typeof users.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Preset = typeof presets.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type BillParticipant = typeof billParticipants.$inferSelect;
export type BillItem = typeof billItems.$inferSelect;
export type ItemAssignment = typeof itemAssignments.$inferSelect;
