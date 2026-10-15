import { z } from 'zod'
import { idSchema, optionalDate, optionalText, requiredText } from './common'

export const insurerSchema = z.object({
  id: idSchema,
  name: requiredText('El nombre es obligatorio'),
  hasAgreement: z.boolean('Indicá si hay convenio'),
  agreementSince: optionalDate,
  phone: optionalText,
})

export const draftInsurerSchema = insurerSchema.omit({ id: true })

export type Insurer = z.infer<typeof insurerSchema>
export type DraftInsurer = z.infer<typeof draftInsurerSchema>

export const insurancePlanSchema = z.object({
  id: idSchema,
  insurerId: idSchema,
  code: requiredText('El código del plan es obligatorio'),
  isActive: z.boolean('Indicá si el plan está activo'),
  description: optionalText,
})

// Plans are created under their insurer (/api/insurers/:insurerId/plans), so
// the insurer comes from the URL and not from the request body.
export const draftInsurancePlanSchema = insurancePlanSchema.omit({
  id: true,
  insurerId: true,
})

export type InsurancePlan = z.infer<typeof insurancePlanSchema>
export type DraftInsurancePlan = z.infer<typeof draftInsurancePlanSchema>
