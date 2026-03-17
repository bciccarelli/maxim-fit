import { z } from 'zod';

export const elementTypeSchema = z.enum([
  'meal',
  'supplement',
  'workout',
  'exercise',
  'other_event',
  'routine_event',
]);

export type ElementType = z.infer<typeof elementTypeSchema>;

export const modifyOperationSchema = z.object({
  op: z.literal('modify'),
  elementId: z.string(),
  elementType: elementTypeSchema,
  fields: z.record(z.unknown()),
  reason: z.string(),
});

export const deleteOperationSchema = z.object({
  op: z.literal('delete'),
  elementId: z.string(),
  elementType: elementTypeSchema,
  reason: z.string(),
});

export const createOperationSchema = z.object({
  op: z.literal('create'),
  elementType: elementTypeSchema,
  parentId: z.string().optional(),
  data: z.record(z.unknown()),
  reason: z.string(),
});

export const protocolOperationSchema = z.discriminatedUnion('op', [
  modifyOperationSchema,
  deleteOperationSchema,
  createOperationSchema,
]);

export type ProtocolOperation = z.infer<typeof protocolOperationSchema>;
export type ModifyOperation = z.infer<typeof modifyOperationSchema>;
export type DeleteOperation = z.infer<typeof deleteOperationSchema>;
export type CreateOperation = z.infer<typeof createOperationSchema>;
