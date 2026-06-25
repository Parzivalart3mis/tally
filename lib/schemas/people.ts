import { z } from 'zod';
import { personName, boundedName } from './common';

export const createPersonSchema = z
  .object({
    name: personName,
  })
  .strict();

export const updatePersonSchema = z
  .object({
    name: personName.optional(),
    archived: z.boolean().optional(),
  })
  .strict()
  .refine((v) => v.name !== undefined || v.archived !== undefined, {
    message: 'Nothing to update',
  });

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

export type CreatePersonInput = z.infer<typeof createPersonSchema>;
export type UpdatePersonInput = z.infer<typeof updatePersonSchema>;
export type CreatePresetInput = z.infer<typeof createPresetSchema>;
export type UpdatePresetInput = z.infer<typeof updatePresetSchema>;
