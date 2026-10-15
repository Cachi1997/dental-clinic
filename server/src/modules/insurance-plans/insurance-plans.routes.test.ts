import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { z } from 'zod'
import {
  insurancePlanSchema,
  insurerSchema,
  type DraftInsurancePlan,
} from '@dental-clinic/shared'
import { app } from '../../app'

const draft: DraftInsurancePlan = {
  code: '310',
  isActive: true,
  description: 'Plan intermedio',
}

// supertest types response.body as `any`: parsing it gives real types and
// fails the test if the API returns a different shape.
const asPlan = (body: unknown) => insurancePlanSchema.parse(body)
const asPlans = (body: unknown) => insurancePlanSchema.array().parse(body)
const asErrors = (body: unknown) =>
  z.object({ errors: z.record(z.string(), z.string()) }).parse(body).errors
const asMessage = (body: unknown) =>
  z.object({ message: z.string() }).parse(body).message

const plansUrl = (insurerId: number | string) =>
  `/api/insurers/${insurerId}/plans`

const createInsurer = async (name = 'OSDE') => {
  const response = await request(app)
    .post('/api/insurers')
    .send({ name, hasAgreement: true, agreementSince: null, phone: null })
  return insurerSchema.parse(response.body)
}

const post = (insurerId: number, overrides: Record<string, unknown> = {}) =>
  request(app)
    .post(plansUrl(insurerId))
    .send({ ...draft, ...overrides })

const createPlan = async (
  insurerId: number,
  overrides: Record<string, unknown> = {},
) => asPlan((await post(insurerId, overrides)).body)

describe('GET /api/insurers/:insurerId/plans', () => {
  it('returns an empty array when the insurer has no plans', async () => {
    const insurer = await createInsurer()

    const response = await request(app).get(plansUrl(insurer.id))

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it('returns only the plans of that insurer, ordered by code', async () => {
    const osde = await createInsurer('OSDE')
    const pami = await createInsurer('PAMI')
    await createPlan(osde.id, { code: '410' })
    await createPlan(osde.id, { code: '210' })
    await createPlan(pami.id, { code: 'Único' })

    const response = await request(app).get(plansUrl(osde.id))
    const codes = asPlans(response.body).map((plan) => plan.code)

    expect(codes).toEqual(['210', '410'])
  })

  it('returns only the active plans with ?active=true', async () => {
    const insurer = await createInsurer()
    await createPlan(insurer.id, { code: '210', isActive: false })
    await createPlan(insurer.id, { code: '310' })

    const response = await request(app)
      .get(plansUrl(insurer.id))
      .query({ active: 'true' })
    const codes = asPlans(response.body).map((plan) => plan.code)

    expect(codes).toEqual(['310'])
  })

  it('returns 404 when the insurer does not exist', async () => {
    const response = await request(app).get(plansUrl(999))

    expect(response.status).toBe(404)
    expect(asMessage(response.body)).toBe('Obra social no encontrada')
  })

  it('returns 404 when the insurer id is not a number', async () => {
    const response = await request(app).get(plansUrl('abc'))

    expect(response.status).toBe(404)
  })
})

describe('GET /api/insurers/:insurerId/plans/:planId', () => {
  it('returns the plan', async () => {
    const insurer = await createInsurer()
    const plan = await createPlan(insurer.id)

    const response = await request(app).get(
      `${plansUrl(insurer.id)}/${plan.id}`,
    )

    expect(response.status).toBe(200)
    expect(asPlan(response.body)).toEqual(plan)
  })

  it('returns 404 for a plan that belongs to another insurer', async () => {
    const osde = await createInsurer('OSDE')
    const pami = await createInsurer('PAMI')
    const pamiPlan = await createPlan(pami.id)

    const response = await request(app).get(
      `${plansUrl(osde.id)}/${pamiPlan.id}`,
    )

    expect(response.status).toBe(404)
    expect(asMessage(response.body)).toBe('Plan no encontrado')
  })
})

describe('POST /api/insurers/:insurerId/plans', () => {
  it('creates the plan under the insurer of the URL', async () => {
    const insurer = await createInsurer()

    const response = await post(insurer.id)

    expect(response.status).toBe(201)
    const { id, ...data } = asPlan(response.body)
    expect(id).toBeGreaterThan(0)
    expect(data).toEqual({ insurerId: insurer.id, ...draft })
  })

  it('ignores an insurerId sent in the body', async () => {
    const osde = await createInsurer('OSDE')
    const pami = await createInsurer('PAMI')

    const response = await post(osde.id, { insurerId: pami.id })

    expect(asPlan(response.body).insurerId).toBe(osde.id)
  })

  it('stores an empty description as null', async () => {
    const insurer = await createInsurer()

    const response = await post(insurer.id, { description: '' })

    expect(asPlan(response.body).description).toBeNull()
  })

  it('rejects an empty code', async () => {
    const insurer = await createInsurer()

    const response = await post(insurer.id, { code: '  ' })

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({
      code: 'El código del plan es obligatorio',
    })
  })

  it('rejects a code that the insurer already has, without case', async () => {
    const insurer = await createInsurer()
    await createPlan(insurer.id, { code: 'Plan A' })

    const response = await post(insurer.id, { code: 'PLAN A' })

    expect(response.status).toBe(409)
    expect(asMessage(response.body)).toBe(
      'Esta obra social ya tiene un plan con ese código',
    )
  })

  it('accepts the same code in another insurer', async () => {
    const osde = await createInsurer('OSDE')
    const swiss = await createInsurer('Swiss Medical')
    await createPlan(osde.id, { code: '310' })

    const response = await post(swiss.id, { code: '310' })

    expect(response.status).toBe(201)
  })

  it('returns 404 when the insurer does not exist', async () => {
    const response = await post(999)

    expect(response.status).toBe(404)
    expect(asMessage(response.body)).toBe('Obra social no encontrada')
  })
})

describe('PUT /api/insurers/:insurerId/plans/:planId', () => {
  const put = (
    insurerId: number,
    planId: number,
    overrides: Record<string, unknown> = {},
  ) =>
    request(app)
      .put(`${plansUrl(insurerId)}/${planId}`)
      .send({ ...draft, ...overrides })

  it('deactivates the plan keeping the same code', async () => {
    const insurer = await createInsurer()
    const plan = await createPlan(insurer.id)

    const response = await put(insurer.id, plan.id, { isActive: false })

    expect(response.status).toBe(200)
    expect(asPlan(response.body)).toEqual({ ...plan, isActive: false })
  })

  it('rejects the code of another plan of the same insurer', async () => {
    const insurer = await createInsurer()
    await createPlan(insurer.id, { code: '210' })
    const plan = await createPlan(insurer.id, { code: '310' })

    const response = await put(insurer.id, plan.id, { code: '210' })

    expect(response.status).toBe(409)
  })

  it('cannot update a plan through another insurer', async () => {
    const osde = await createInsurer('OSDE')
    const pami = await createInsurer('PAMI')
    const pamiPlan = await createPlan(pami.id, { code: 'Único' })

    const response = await put(osde.id, pamiPlan.id, { code: 'Cambiado' })
    const stored = await request(app).get(`${plansUrl(pami.id)}/${pamiPlan.id}`)

    expect(response.status).toBe(404)
    expect(asPlan(stored.body).code).toBe('Único')
  })

  it('returns 404 when the plan does not exist', async () => {
    const insurer = await createInsurer()

    const response = await put(insurer.id, 999)

    expect(response.status).toBe(404)
    expect(asMessage(response.body)).toBe('Plan no encontrado')
  })

  it('returns 404 when the insurer does not exist', async () => {
    const response = await put(999, 1)

    expect(response.status).toBe(404)
    expect(asMessage(response.body)).toBe('Obra social no encontrada')
  })

  it('returns 400 when the body is invalid', async () => {
    const insurer = await createInsurer()
    const plan = await createPlan(insurer.id)

    const response = await put(insurer.id, plan.id, { isActive: 'yes' })

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({
      isActive: 'Indicá si el plan está activo',
    })
  })
})

describe('DELETE /api/insurers/:insurerId/plans/:planId', () => {
  it('does not exist, because plans are deactivated instead', async () => {
    const insurer = await createInsurer()
    const plan = await createPlan(insurer.id)

    const response = await request(app).delete(
      `${plansUrl(insurer.id)}/${plan.id}`,
    )

    expect(response.status).toBe(404)
  })
})
