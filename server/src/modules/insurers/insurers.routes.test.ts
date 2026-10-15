import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { z } from 'zod'
import { insurerSchema, type DraftInsurer } from '@dental-clinic/shared'
import { app } from '../../app'

const draft: DraftInsurer = {
  name: 'OSDE',
  hasAgreement: true,
  agreementSince: '2019-03-01',
  phone: '0800-555-6733',
}

// supertest types response.body as `any`: parsing it gives real types and
// fails the test if the API returns a different shape.
const asInsurer = (body: unknown) => insurerSchema.parse(body)
const asInsurers = (body: unknown) => insurerSchema.array().parse(body)
const asErrors = (body: unknown) =>
  z.object({ errors: z.record(z.string(), z.string()) }).parse(body).errors
const asMessage = (body: unknown) =>
  z.object({ message: z.string() }).parse(body).message

const post = (overrides: Record<string, unknown> = {}) =>
  request(app)
    .post('/api/insurers')
    .send({ ...draft, ...overrides })

const createInsurer = async (overrides: Record<string, unknown> = {}) =>
  asInsurer((await post(overrides)).body)

describe('GET /api/insurers', () => {
  it('returns an empty array when there are no insurers', async () => {
    const response = await request(app).get('/api/insurers')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it('returns the insurers ordered by name', async () => {
    await createInsurer({ name: 'Swiss Medical' })
    await createInsurer({ name: 'OSDE' })
    await createInsurer({ name: 'Galeno' })

    const response = await request(app).get('/api/insurers')
    const names = asInsurers(response.body).map((insurer) => insurer.name)

    expect(names).toEqual(['Galeno', 'OSDE', 'Swiss Medical'])
  })
})

describe('GET /api/insurers/:id', () => {
  it('returns the insurer', async () => {
    const created = await createInsurer()

    const response = await request(app).get(`/api/insurers/${created.id}`)

    expect(response.status).toBe(200)
    expect(asInsurer(response.body)).toEqual(created)
  })

  it('returns 404 when the insurer does not exist', async () => {
    const response = await request(app).get('/api/insurers/999')

    expect(response.status).toBe(404)
    expect(asMessage(response.body)).toBe('Obra social no encontrada')
  })

  it.each(['abc', '0', '-1', '1.5', '0x10', '99999999999'])(
    'returns 404 when the id is "%s"',
    async (id) => {
      const response = await request(app).get(`/api/insurers/${id}`)

      expect(response.status).toBe(404)
    },
  )
})

describe('POST /api/insurers', () => {
  it('creates the insurer', async () => {
    const response = await post()

    expect(response.status).toBe(201)
    const { id, ...data } = asInsurer(response.body)
    expect(id).toBeGreaterThan(0)
    expect(data).toEqual(draft)
  })

  it('trims the name and stores an empty phone as null', async () => {
    const response = await post({ name: '  OSDE  ', phone: '' })

    expect(response.status).toBe(201)
    expect(asInsurer(response.body)).toMatchObject({
      name: 'OSDE',
      phone: null,
    })
  })

  it('accepts an insurer without agreement date or phone', async () => {
    const response = await post({
      hasAgreement: false,
      agreementSince: null,
      phone: null,
    })

    expect(response.status).toBe(201)
    expect(asInsurer(response.body)).toMatchObject({
      hasAgreement: false,
      agreementSince: null,
      phone: null,
    })
  })

  it('rejects an empty name', async () => {
    const response = await post({ name: '   ' })

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({
      name: 'El nombre es obligatorio',
    })
  })

  it('rejects a malformed agreement date', async () => {
    const response = await post({ agreementSince: '01/03/2019' })

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({
      agreementSince: 'La fecha debe tener el formato AAAA-MM-DD',
    })
  })

  it('reports every invalid field in Spanish when the body is empty', async () => {
    const response = await request(app).post('/api/insurers').send({})

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({
      name: 'El nombre es obligatorio',
      hasAgreement: 'Indicá si hay convenio',
    })
  })

  it('rejects a name that differs from an existing one only in case', async () => {
    await createInsurer({ name: 'OSDE' })

    const response = await post({ name: 'osde' })

    expect(response.status).toBe(409)
    expect(asMessage(response.body)).toBe(
      'Ya existe una obra social con ese nombre',
    )
  })

  it('ignores an id sent in the body', async () => {
    const response = await post({ id: 999 })

    expect(response.status).toBe(201)
    expect(asInsurer(response.body).id).not.toBe(999)
  })
})

describe('PUT /api/insurers/:id', () => {
  it('updates the insurer keeping the same name', async () => {
    const created = await createInsurer()

    const response = await request(app)
      .put(`/api/insurers/${created.id}`)
      .send({ ...draft, hasAgreement: false, agreementSince: null })

    expect(response.status).toBe(200)
    expect(asInsurer(response.body)).toEqual({
      ...created,
      hasAgreement: false,
      agreementSince: null,
    })
  })

  it('persists the changes', async () => {
    const created = await createInsurer()

    await request(app)
      .put(`/api/insurers/${created.id}`)
      .send({ ...draft, name: 'OSDE Binario' })
    const response = await request(app).get(`/api/insurers/${created.id}`)

    expect(asInsurer(response.body).name).toBe('OSDE Binario')
  })

  it('rejects the name of another insurer', async () => {
    await createInsurer({ name: 'PAMI' })
    const osde = await createInsurer({ name: 'OSDE' })

    const response = await request(app)
      .put(`/api/insurers/${osde.id}`)
      .send({ ...draft, name: 'pami' })

    expect(response.status).toBe(409)
  })

  it('returns 404 when the insurer does not exist', async () => {
    const response = await request(app).put('/api/insurers/999').send(draft)

    expect(response.status).toBe(404)
  })

  it('returns 400 when the body is invalid', async () => {
    const created = await createInsurer()

    const response = await request(app)
      .put(`/api/insurers/${created.id}`)
      .send({ ...draft, name: '' })

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({
      name: 'El nombre es obligatorio',
    })
  })
})

describe('DELETE /api/insurers/:id', () => {
  it('does not exist, because insurers are deactivated instead', async () => {
    const created = await createInsurer()

    const response = await request(app).delete(`/api/insurers/${created.id}`)

    expect(response.status).toBe(404)
  })
})
