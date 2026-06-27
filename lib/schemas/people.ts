import { z } from 'zod';
import { personName, boundedName } from './common';
import { PERSON_COLOR_IDS } from '@/lib/colors';

const personColor = z.enum(PERSON_COLOR_IDS);
const personNote = z.string().trim().max(200);

export const createPersonSchema = z
  .object({
    name: personName,
    color: personColor.optional(),
    note: personNote.optional(),
  })
  .strict();

export const updatePersonSchema = z
  .object({
    name: personName.optional(),
    archived: z.boolean().optional(),
    color: personColor.nullable().optional(),
    note: personNote.nullable().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.name !== undefined ||
      v.archived !== undefined ||
      v.color !== undefined ||
      v.note !== undefined,
    { message: 'Nothing to update' },
  );

export const createPresetSchema = z
  .object({
    name: boundedName(120),
    memberIds: z.array(z.string().min(1).max(64)).max(100).default([]),
  })
  .strict();

export const updatePresetSchema = z
  .object({
    name: boundedName(120).optional(),
    memberIds: z.array(z.string().min(1).max(64)).max(100).optional(),
  })
  .strict()
  .refine((v) => v.name !== undefined || v.memberIds !== undefined, {
    message: 'Nothing to update',
  });

export const setSelfSchema = z
  .object({ selfPersonId: z.string().min(1).max(64).nullable() })
  .strict();

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type CreatePresetInput = z.infer<typeof createPresetSchema>;
export type UpdatePresetInput = z.infer<typeof updatePresetSchema>;
