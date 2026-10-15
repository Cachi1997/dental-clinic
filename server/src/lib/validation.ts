import { z } from 'zod'

// Ids arrive as text in the URL. Only plain digits are accepted ("0x10" or
// "1e2" would also convert to numbers), and the upper bound is the largest
// value of a Postgres INTEGER column, so Prisma never receives an id it
// cannot query.
const idParamSchema = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().positive().max(2_147_483_647))

export const parseId = (value: string): number | null => {
  const result = idParamSchema.safeParse(value)
  return result.success ? result.data : null
}

export type ParseResult<T> =
  { data: T; errors: null } | { data: null; errors: Record<string, string> }

// Zod can report several issues for the same field. Only the first one is
// kept, the same way the form shows a single message per input.
export const parseBody = <T extends z.ZodType>(
  schema: T,
  body: unknown,
): ParseResult<z.output<T>> => {
  const result = schema.safeParse(body)
  if (result.success) return { data: result.data, errors: null }

  const errors: Record<string, string> = {}
  for (const issue of result.error.issues) {
    errors[issue.path.join('.')] ??= issue.message
  }
  return { data: null, errors }
}
