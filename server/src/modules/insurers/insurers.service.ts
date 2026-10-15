import type { DraftInsurer, Insurer } from '@dental-clinic/shared'
import { prisma } from '../../prisma'
import type { Insurer as InsurerRow } from '../../generated/prisma/client'
import { isUniqueViolation } from '../../lib/prisma-errors'

export type CreateInsurerResult =
  { ok: true; insurer: Insurer } | { ok: false; reason: 'name_taken' }

export type UpdateInsurerResult =
  | { ok: true; insurer: Insurer }
  | { ok: false; reason: 'not_found' | 'name_taken' }

// The database stores DATE columns as a Date at midnight UTC; the API uses
// 'YYYY-MM-DD' strings.
const toInsurer = (row: InsurerRow): Insurer => ({
  id: row.id,
  name: row.name,
  hasAgreement: row.hasAgreement,
  agreementSince: row.agreementSince?.toISOString().slice(0, 10) ?? null,
  phone: row.phone,
})

const toData = (draft: DraftInsurer) => ({
  ...draft,
  agreementSince: draft.agreementSince ? new Date(draft.agreementSince) : null,
})

// The unique index only rejects exact duplicates, so "OSDE" and "Osde" are
// compared here without case. The insurer being updated is left out, so it can
// be saved without changing its name.
const isNameTaken = async (name: string, exceptId?: number) => {
  const match = await prisma.insurer.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      ...(exceptId !== undefined && { id: { not: exceptId } }),
    },
    select: { id: true },
  })
  return match !== null
}

export const listInsurers = async (): Promise<Insurer[]> => {
  const rows = await prisma.insurer.findMany({ orderBy: { name: 'asc' } })
  return rows.map(toInsurer)
}

export const findInsurer = async (id: number): Promise<Insurer | null> => {
  const row = await prisma.insurer.findUnique({ where: { id } })
  return row ? toInsurer(row) : null
}

export const createInsurer = async (
  draft: DraftInsurer,
): Promise<CreateInsurerResult> => {
  if (await isNameTaken(draft.name)) return { ok: false, reason: 'name_taken' }

  try {
    const row = await prisma.insurer.create({ data: toData(draft) })
    return { ok: true, insurer: toInsurer(row) }
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: 'name_taken' }
    throw error
  }
}

export const updateInsurer = async (
  id: number,
  draft: DraftInsurer,
): Promise<UpdateInsurerResult> => {
  const exists = await prisma.insurer.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!exists) return { ok: false, reason: 'not_found' }

  if (await isNameTaken(draft.name, id)) {
    return { ok: false, reason: 'name_taken' }
  }

  try {
    const row = await prisma.insurer.update({
      where: { id },
      data: toData(draft),
    })
    return { ok: true, insurer: toInsurer(row) }
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: 'name_taken' }
    throw error
  }
}
