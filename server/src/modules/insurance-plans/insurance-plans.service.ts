import type { DraftInsurancePlan, InsurancePlan } from '@dental-clinic/shared'
import { prisma } from '../../prisma'
import type { InsurancePlan as InsurancePlanRow } from '../../generated/prisma/client'
import { isUniqueViolation } from '../../lib/prisma-errors'

export type CreatePlanResult =
  | { ok: true; plan: InsurancePlan }
  | { ok: false; reason: 'insurer_not_found' | 'code_taken' }

export type UpdatePlanResult =
  | { ok: true; plan: InsurancePlan }
  | { ok: false; reason: 'insurer_not_found' | 'plan_not_found' | 'code_taken' }

const toPlan = (row: InsurancePlanRow): InsurancePlan => ({
  id: row.id,
  insurerId: row.insurerId,
  code: row.code,
  isActive: row.isActive,
  description: row.description,
})

const insurerExists = async (insurerId: number) => {
  const insurer = await prisma.insurer.findUnique({
    where: { id: insurerId },
    select: { id: true },
  })
  return insurer !== null
}

// Codes are unique per insurer and compared without case, so OSDE cannot have
// both "Plan A" and "PLAN A". The plan being updated is left out, so it can be
// saved without changing its code.
const isCodeTaken = async (
  insurerId: number,
  code: string,
  exceptId?: number,
) => {
  const match = await prisma.insurancePlan.findFirst({
    where: {
      insurerId,
      code: { equals: code, mode: 'insensitive' },
      id: exceptId !== undefined ? { not: exceptId } : undefined,
    },
    select: { id: true },
  })
  return match !== null
}

// Returns null when the insurer does not exist, so the route can answer 404
// instead of an empty list.
export const listPlans = async (
  insurerId: number,
  { activeOnly = false } = {},
): Promise<InsurancePlan[] | null> => {
  if (!(await insurerExists(insurerId))) return null

  const rows = await prisma.insurancePlan.findMany({
    where: { insurerId, ...(activeOnly && { isActive: true }) },
    orderBy: { code: 'asc' },
  })
  return rows.map(toPlan)
}

// The plan is looked up together with its insurer: a plan that belongs to
// another insurer is treated as not found.
export const findPlan = async (
  insurerId: number,
  planId: number,
): Promise<InsurancePlan | null> => {
  const row = await prisma.insurancePlan.findFirst({
    where: { id: planId, insurerId },
  })
  return row ? toPlan(row) : null
}

export const createPlan = async (
  insurerId: number,
  draft: DraftInsurancePlan,
): Promise<CreatePlanResult> => {
  if (!(await insurerExists(insurerId))) {
    return { ok: false, reason: 'insurer_not_found' }
  }
  if (await isCodeTaken(insurerId, draft.code)) {
    return { ok: false, reason: 'code_taken' }
  }

  try {
    const row = await prisma.insurancePlan.create({
      data: { ...draft, insurerId },
    })
    return { ok: true, plan: toPlan(row) }
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: 'code_taken' }
    throw error
  }
}

export const updatePlan = async (
  insurerId: number,
  planId: number,
  draft: DraftInsurancePlan,
): Promise<UpdatePlanResult> => {
  if (!(await insurerExists(insurerId))) {
    return { ok: false, reason: 'insurer_not_found' }
  }
  if (!(await findPlan(insurerId, planId))) {
    return { ok: false, reason: 'plan_not_found' }
  }
  if (await isCodeTaken(insurerId, draft.code, planId)) {
    return { ok: false, reason: 'code_taken' }
  }

  try {
    const row = await prisma.insurancePlan.update({
      where: { id: planId },
      data: draft,
    })
    return { ok: true, plan: toPlan(row) }
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: 'code_taken' }
    throw error
  }
}
