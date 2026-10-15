import type { DraftPatient, Patient } from '@dental-clinic/shared'
import { prisma } from '../../prisma'
import type {
  Patient as PatientRow,
  Prisma,
} from '../../generated/prisma/client'
import { isUniqueViolation } from '../../lib/prisma-errors'

type PlanProblem = 'plan_not_found' | 'plan_inactive'

export type CreatePatientResult =
  | { ok: true; patient: Patient }
  | { ok: false; reason: 'document_taken' | PlanProblem }

export type UpdatePatientResult =
  | { ok: true; patient: Patient }
  | { ok: false; reason: 'not_found' | 'document_taken' | PlanProblem }

// The database stores DATE columns as a Date at midnight UTC; the API uses
// 'YYYY-MM-DD' strings.
const toPatient = (row: PatientRow): Patient => ({
  id: row.id,
  firstName: row.firstName,
  lastName: row.lastName,
  documentType: row.documentType,
  documentNumber: row.documentNumber,
  birthDate: row.birthDate?.toISOString().slice(0, 10) ?? null,
  phone: row.phone,
  email: row.email,
  address: row.address,
  insurancePlanId: row.insurancePlanId,
  memberNumber: row.memberNumber,
  guardian: row.guardian,
  alert: row.alert,
})

const toData = (draft: DraftPatient) => ({
  ...draft,
  birthDate: draft.birthDate ? new Date(draft.birthDate) : null,
})

// Each word of the search has to match the first name, the last name or the
// start of the document number, so "ana perez" or "30123" both work.
const searchFilter = (search: string): Prisma.PatientWhereInput => ({
  AND: search
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => ({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        {
          documentNumber: {
            startsWith: term.replace(/\./g, '').toUpperCase(),
          },
        },
      ],
    })),
})

// A patient can only be assigned a plan that exists and is active. A patient
// who already has a plan keeps it even after the plan is deactivated.
const checkPlan = async (
  planId: number | null,
  currentPlanId: number | null = null,
): Promise<PlanProblem | null> => {
  if (planId === null || planId === currentPlanId) return null

  const plan = await prisma.insurancePlan.findUnique({
    where: { id: planId },
    select: { isActive: true },
  })
  if (!plan) return 'plan_not_found'
  if (!plan.isActive) return 'plan_inactive'
  return null
}

export const listPatients = async (search?: string): Promise<Patient[]> => {
  const rows = await prisma.patient.findMany({
    where: search ? searchFilter(search) : undefined,
    orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
  })
  return rows.map(toPatient)
}

export const findPatient = async (id: number): Promise<Patient | null> => {
  const row = await prisma.patient.findUnique({ where: { id } })
  return row ? toPatient(row) : null
}

export const createPatient = async (
  draft: DraftPatient,
): Promise<CreatePatientResult> => {
  const planProblem = await checkPlan(draft.insurancePlanId)
  if (planProblem) return { ok: false, reason: planProblem }

  try {
    const row = await prisma.patient.create({ data: toData(draft) })
    return { ok: true, patient: toPatient(row) }
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: 'document_taken' }
    throw error
  }
}

export const updatePatient = async (
  id: number,
  draft: DraftPatient,
): Promise<UpdatePatientResult> => {
  const current = await prisma.patient.findUnique({
    where: { id },
    select: { insurancePlanId: true },
  })
  if (!current) return { ok: false, reason: 'not_found' }

  const planProblem = await checkPlan(
    draft.insurancePlanId,
    current.insurancePlanId,
  )
  if (planProblem) return { ok: false, reason: planProblem }

  try {
    const row = await prisma.patient.update({
      where: { id },
      data: toData(draft),
    })
    return { ok: true, patient: toPatient(row) }
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: 'document_taken' }
    throw error
  }
}
