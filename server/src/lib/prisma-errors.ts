import { Prisma } from '../generated/prisma/client'

// P2002: a value already exists in a unique column. Services check for
// duplicates before writing, but two requests can pass that check at the same
// time; the unique index then rejects the second one with this error.
export const isUniqueViolation = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002'
