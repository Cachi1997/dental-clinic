import { Router, type Response } from 'express'
import { draftPatientSchema } from '@dental-clinic/shared'
import { parseBody, parseId } from '../../lib/validation'
import {
  createPatient,
  findPatient,
  listPatients,
  updatePatient,
  type CreatePatientResult,
} from './patients.service'

export const patientsRouter = Router()

const NOT_FOUND = { message: 'Paciente no encontrado' }

type Failure = Exclude<CreatePatientResult, { ok: true }>['reason']

// Plan problems are reported on the insurancePlanId field, so the form can show
// them under the plan selector.
const sendFailure = (res: Response, reason: Failure | 'not_found') => {
  switch (reason) {
    case 'not_found':
      res.status(404).json(NOT_FOUND)
      return
    case 'document_taken':
      res
        .status(409)
        .json({ message: 'Ya existe un paciente con ese documento' })
      return
    case 'plan_not_found':
      res
        .status(400)
        .json({ errors: { insurancePlanId: 'El plan elegido no existe' } })
      return
    case 'plan_inactive':
      res
        .status(400)
        .json({ errors: { insurancePlanId: 'El plan elegido no está activo' } })
      return
  }
}

// GET /api/patients?search=ana%20perez filters by name or document number.
patientsRouter.get('/', async (req, res) => {
  const search =
    typeof req.query.search === 'string' ? req.query.search : undefined
  res.json(await listPatients(search))
})

patientsRouter.get('/:id', async (req, res) => {
  const id = parseId(req.params.id)
  const patient = id === null ? null : await findPatient(id)
  if (!patient) {
    res.status(404).json(NOT_FOUND)
    return
  }
  res.json(patient)
})

patientsRouter.post('/', async (req, res) => {
  const { data, errors } = parseBody(draftPatientSchema, req.body)
  if (!data) {
    res.status(400).json({ errors })
    return
  }

  const result = await createPatient(data)
  if (!result.ok) {
    sendFailure(res, result.reason)
    return
  }
  res.status(201).json(result.patient)
})

patientsRouter.put('/:id', async (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(404).json(NOT_FOUND)
    return
  }

  const { data, errors } = parseBody(draftPatientSchema, req.body)
  if (!data) {
    res.status(400).json({ errors })
    return
  }

  const result = await updatePatient(id, data)
  if (!result.ok) {
    sendFailure(res, result.reason)
    return
  }
  res.json(result.patient)
})
