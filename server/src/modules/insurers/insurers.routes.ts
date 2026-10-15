import { Router } from 'express'
import { draftInsurerSchema } from '@dental-clinic/shared'
import { parseBody, parseId } from '../../lib/validation'
import {
  createInsurer,
  findInsurer,
  listInsurers,
  updateInsurer,
} from './insurers.service'

export const insurersRouter = Router()

const NOT_FOUND = { message: 'Obra social no encontrada' }
const NAME_TAKEN = { message: 'Ya existe una obra social con ese nombre' }

insurersRouter.get('/', async (_req, res) => {
  res.json(await listInsurers())
})

insurersRouter.get('/:id', async (req, res) => {
  const id = parseId(req.params.id)
  const insurer = id === null ? null : await findInsurer(id)
  if (!insurer) {
    res.status(404).json(NOT_FOUND)
    return
  }
  res.json(insurer)
})

insurersRouter.post('/', async (req, res) => {
  const { data, errors } = parseBody(draftInsurerSchema, req.body)
  if (!data) {
    res.status(400).json({ errors })
    return
  }

  const result = await createInsurer(data)
  if (!result.ok) {
    res.status(409).json(NAME_TAKEN)
    return
  }
  res.status(201).json(result.insurer)
})

insurersRouter.put('/:id', async (req, res) => {
  const id = parseId(req.params.id)
  if (id === null) {
    res.status(404).json(NOT_FOUND)
    return
  }

  const { data, errors } = parseBody(draftInsurerSchema, req.body)
  if (!data) {
    res.status(400).json({ errors })
    return
  }

  const result = await updateInsurer(id, data)
  if (!result.ok) {
    if (result.reason === 'not_found') res.status(404).json(NOT_FOUND)
    else res.status(409).json(NAME_TAKEN)
    return
  }
  res.json(result.insurer)
})
