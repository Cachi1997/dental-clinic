import { Router, type Request, type Response } from 'express'
import { draftInsurancePlanSchema } from '@dental-clinic/shared'
import { parseBody, parseId } from '../../lib/validation'
import {
  createPlan,
  findPlan,
  listPlans,
  updatePlan,
  type UpdatePlanResult,
} from './insurance-plans.service'

// Mounted on /api/insurers/:insurerId/plans. mergeParams makes :insurerId,
// which belongs to the parent path, available in req.params.
export const plansRouter = Router({ mergeParams: true })

type InsurerParams = { insurerId: string }
type PlanParams = InsurerParams & { planId: string }

const INSURER_NOT_FOUND = { message: 'Obra social no encontrada' }
const PLAN_NOT_FOUND = { message: 'Plan no encontrado' }
const CODE_TAKEN = {
  message: 'Esta obra social ya tiene un plan con ese código',
}

type Failure = Exclude<UpdatePlanResult, { ok: true }>['reason']

const sendFailure = (res: Response, reason: Failure) => {
  switch (reason) {
    case 'insurer_not_found':
      res.status(404).json(INSURER_NOT_FOUND)
      return
    case 'plan_not_found':
      res.status(404).json(PLAN_NOT_FOUND)
      return
    case 'code_taken':
      res.status(409).json(CODE_TAKEN)
      return
  }
}

// GET /api/insurers/:insurerId/plans?active=true returns only active plans,
// the ones a patient can be assigned.
plansRouter.get('/', async (req: Request<InsurerParams>, res) => {
  const insurerId = parseId(req.params.insurerId)
  const activeOnly = req.query.active === 'true'
  const plans =
    insurerId === null ? null : await listPlans(insurerId, { activeOnly })
  if (!plans) {
    res.status(404).json(INSURER_NOT_FOUND)
    return
  }
  res.json(plans)
})

plansRouter.get('/:planId', async (req: Request<PlanParams>, res) => {
  const insurerId = parseId(req.params.insurerId)
  const planId = parseId(req.params.planId)
  const plan =
    insurerId === null || planId === null
      ? null
      : await findPlan(insurerId, planId)
  if (!plan) {
    res.status(404).json(PLAN_NOT_FOUND)
    return
  }
  res.json(plan)
})

plansRouter.post('/', async (req: Request<InsurerParams>, res) => {
  const insurerId = parseId(req.params.insurerId)
  if (insurerId === null) {
    res.status(404).json(INSURER_NOT_FOUND)
    return
  }

  const { data, errors } = parseBody(draftInsurancePlanSchema, req.body)
  if (!data) {
    res.status(400).json({ errors })
    return
  }

  const result = await createPlan(insurerId, data)
  if (!result.ok) {
    sendFailure(res, result.reason)
    return
  }
  res.status(201).json(result.plan)
})

plansRouter.put('/:planId', async (req: Request<PlanParams>, res) => {
  const insurerId = parseId(req.params.insurerId)
  const planId = parseId(req.params.planId)
  if (insurerId === null) {
    res.status(404).json(INSURER_NOT_FOUND)
    return
  }
  if (planId === null) {
    res.status(404).json(PLAN_NOT_FOUND)
    return
  }

  const { data, errors } = parseBody(draftInsurancePlanSchema, req.body)
  if (!data) {
    res.status(400).json({ errors })
    return
  }

  const result = await updatePlan(insurerId, planId, data)
  if (!result.ok) {
    sendFailure(res, result.reason)
    return
  }
  res.json(result.plan)
})
