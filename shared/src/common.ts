import { z } from 'zod'

const INVALID_ID = 'Elegí un valor válido'

export const idSchema = z
  .number(INVALID_ID)
  .int(INVALID_ID)
  .positive(INVALID_ID)

// Required text uses the same message when the value is missing and when it is
// empty, so the user never sees Zod's default English messages.
export const requiredText = (message: string) =>
  z.string(message).trim().min(1, message)

// Optional fields accept '', null or a missing key, and always end up as null.
// Forms send '' for empty inputs, and the database stores those as null.
export const optionalText = z
  .string()
  .trim()
  .nullish()
  .transform((value) => value || null)

// Dates without time travel as 'YYYY-MM-DD', because JSON has no date type.
export const dateSchema = z.iso.date(
  'La fecha debe tener el formato AAAA-MM-DD',
)

export const optionalDate = dateSchema
  .nullish()
  .transform((value) => value ?? null)

export const optionalId = idSchema.nullish().transform((value) => value ?? null)

export const documentTypes = ['DNI', 'PASSPORT', 'LIBRETA'] as const

export type DocumentType = (typeof documentTypes)[number]
