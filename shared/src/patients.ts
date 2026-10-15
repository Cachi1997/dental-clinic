import { z } from 'zod'
import {
  documentTypes,
  idSchema,
  optionalDate,
  optionalId,
  optionalText,
  requiredText,
} from './common'

const DOCUMENT_NUMBER_REQUIRED = 'El número de documento es obligatorio'

// Fields shared by the create/update payload and the API response.
const patientFields = z.object({
  firstName: requiredText('El nombre es obligatorio'),
  lastName: requiredText('El apellido es obligatorio'),
  documentType: z.enum(documentTypes, 'Elegí un tipo de documento válido'),
  // Dots and spaces are dropped and letters uppercased, so "30.123.456" is
  // stored as "30123456" and the passport "aab123" as "AAB123". The unique
  // index can then catch duplicates written in different ways.
  documentNumber: z
    .string(DOCUMENT_NUMBER_REQUIRED)
    .transform((value) => value.replace(/[.\s]/g, '').toUpperCase())
    .pipe(z.string().min(1, DOCUMENT_NUMBER_REQUIRED)),
  birthDate: optionalDate,
  phone: requiredText('El teléfono es obligatorio'),
  email: optionalText.pipe(z.email('El email no es válido').nullable()),
  address: optionalText,
  insurancePlanId: optionalId,
  memberNumber: optionalText,
  guardian: optionalText,
  alert: optionalText,
})

export const draftPatientSchema = patientFields
  .refine(
    (patient) =>
      patient.documentType !== 'DNI' || /^\d+$/.test(patient.documentNumber),
    { message: 'El DNI solo puede tener números', path: ['documentNumber'] },
  )
  .refine(
    (patient) =>
      patient.insurancePlanId === null || patient.memberNumber !== null,
    {
      message: 'El número de afiliado es obligatorio si el paciente tiene plan',
      path: ['memberNumber'],
    },
  )

export const patientSchema = patientFields.extend({ id: idSchema })

export type Patient = z.infer<typeof patientSchema>
export type DraftPatient = z.infer<typeof draftPatientSchema>
