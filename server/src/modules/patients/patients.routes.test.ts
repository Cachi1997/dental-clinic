import { describe, expect, it } from 'vitest'
import request from 'supertest'
import { z } from 'zod'
import { patientSchema, type DraftPatient } from '@dental-clinic/shared'
import { app } from '../../app'
import { prisma } from '../../prisma'

const draft = {
  firstName: 'Ana',
  lastName: 'Pérez',
  documentType: 'DNI',
  documentNumber: '30123456',
  birthDate: '1990-05-20',
  phone: '+5491112345678',
  email: 'ana@example.com',
  address: 'Av. Siempre Viva 742',
  insurancePlanId: null,
  memberNumber: null,
  guardian: null,
  alert: 'Alérgica a la penicilina',
} satisfies DraftPatient

// supertest types response.body as `any`: parsing it gives real types and
// fails the test if the API returns a different shape.
const asPatient = (body: unknown) => patientSchema.parse(body)
const asPatients = (body: unknown) => patientSchema.array().parse(body)
const asErrors = (body: unknown) =>
  z.object({ errors: z.record(z.string(), z.string()) }).parse(body).errors
const asMessage = (body: unknown) =>
  z.object({ message: z.string() }).parse(body).message

const post = (overrides: Record<string, unknown> = {}) =>
  request(app)
    .post('/api/patients')
    .send({ ...draft, ...overrides })

const put = (id: number, overrides: Record<string, unknown> = {}) =>
  request(app)
    .put(`/api/patients/${id}`)
    .send({ ...draft, ...overrides })

const createPatient = async (overrides: Record<string, unknown> = {}) =>
  asPatient((await post(overrides)).body)

// There are no plan endpoints yet, so plans are created directly in the
// database.
let insurerCount = 0
const createPlan = async ({ isActive = true } = {}) => {
  insurerCount += 1
  const insurer = await prisma.insurer.create({
    data: { name: `Obra social ${insurerCount}`, hasAgreement: true },
  })
  return prisma.insurancePlan.create({
    data: { insurerId: insurer.id, code: '310', isActive },
  })
}

const search = async (text: string) => {
  const response = await request(app)
    .get('/api/patients')
    .query({ search: text })
  return asPatients(response.body).map((patient) => patient.firstName)
}

describe('GET /api/patients', () => {
  it('returns an empty array when there are no patients', async () => {
    const response = await request(app).get('/api/patients')

    expect(response.status).toBe(200)
    expect(response.body).toEqual([])
  })

  it('returns the patients ordered by last name and first name', async () => {
    await createPatient({
      firstName: 'Juan',
      lastName: 'Gómez',
      documentNumber: '1',
    })
    await createPatient({
      firstName: 'Ana',
      lastName: 'Gómez',
      documentNumber: '2',
    })
    await createPatient({
      firstName: 'Ana',
      lastName: 'Acosta',
      documentNumber: '3',
    })

    const response = await request(app).get('/api/patients')
    const names = asPatients(response.body).map(
      (patient) => `${patient.lastName}, ${patient.firstName}`,
    )

    expect(names).toEqual(['Acosta, Ana', 'Gómez, Ana', 'Gómez, Juan'])
  })
})

describe('GET /api/patients?search=', () => {
  const createSearchData = async () => {
    await createPatient({
      firstName: 'Ana',
      lastName: 'Pérez',
      documentNumber: '30123456',
    })
    await createPatient({
      firstName: 'Mariana',
      lastName: 'Gómez',
      documentNumber: '20111222',
    })
    await createPatient({
      firstName: 'Juan',
      lastName: 'Pérez',
      documentNumber: '40999888',
    })
  }

  it('finds patients by part of the first name', async () => {
    await createSearchData()

    expect(await search('ana')).toEqual(['Mariana', 'Ana'])
  })

  it('finds patients by last name without case', async () => {
    await createSearchData()

    expect(await search('PÉREZ')).toEqual(['Ana', 'Juan'])
  })

  it('requires every word to match', async () => {
    await createSearchData()

    expect(await search('ana pérez')).toEqual(['Ana'])
  })

  it('finds patients by the start of the document number, with dots', async () => {
    await createSearchData()

    expect(await search('30.123')).toEqual(['Ana'])
  })

  it('does not match the middle of the document number', async () => {
    await createSearchData()

    expect(await search('123456')).toEqual([])
  })

  it('returns every patient when the search is blank', async () => {
    await createSearchData()

    expect(await search('   ')).toHaveLength(3)
  })

  it('finds "Pérez" when searching "perez", without accents', async () => {
    await createSearchData()

    expect(await search('perez')).toEqual(['Ana', 'Juan'])
  })

  it('finds "Núñez" when searching "nunez"', async () => {
    await createPatient({ firstName: 'Lucía', lastName: 'Núñez' })

    expect(await search('nunez')).toEqual(['Lucía'])
    expect(await search('LUCIA NUÑEZ')).toEqual(['Lucía'])
  })

  it('finds a patient by the new name after an update', async () => {
    const created = await createPatient({ lastName: 'Pérez' })

    await put(created.id, { lastName: 'Martínez' })

    expect(await search('perez')).toEqual([])
    expect(await search('martinez')).toEqual(['Ana'])
  })

  it('does not include the search text in the response', async () => {
    const created = await post()

    expect(created.body).not.toHaveProperty('searchText')
  })
})

describe('GET /api/patients/:id', () => {
  it('returns the patient', async () => {
    const created = await createPatient()

    const response = await request(app).get(`/api/patients/${created.id}`)

    expect(response.status).toBe(200)
    expect(asPatient(response.body)).toEqual(created)
  })

  it('returns 404 when the patient does not exist', async () => {
    const response = await request(app).get('/api/patients/999')

    expect(response.status).toBe(404)
    expect(asMessage(response.body)).toBe('Paciente no encontrado')
  })

  it('returns 404 when the id is not a number', async () => {
    const response = await request(app).get('/api/patients/abc')

    expect(response.status).toBe(404)
  })
})

describe('POST /api/patients', () => {
  it('creates the patient', async () => {
    const response = await post()

    expect(response.status).toBe(201)
    const { id, ...data } = asPatient(response.body)
    expect(id).toBeGreaterThan(0)
    expect(data).toEqual(draft)
  })

  it('creates a patient with only the required fields', async () => {
    const response = await request(app).post('/api/patients').send({
      firstName: 'Ana',
      lastName: 'Pérez',
      documentType: 'DNI',
      documentNumber: '30123456',
      phone: '+5491112345678',
    })

    expect(response.status).toBe(201)
    expect(asPatient(response.body)).toMatchObject({
      birthDate: null,
      email: null,
      address: null,
      insurancePlanId: null,
      memberNumber: null,
      guardian: null,
      alert: null,
    })
  })

  it('stores empty optional fields as null', async () => {
    const response = await post({ email: '', address: '  ', alert: '' })

    expect(response.status).toBe(201)
    expect(asPatient(response.body)).toMatchObject({
      email: null,
      address: null,
      alert: null,
    })
  })

  it('removes the dots from a DNI', async () => {
    const response = await post({ documentNumber: '30.123.456' })

    expect(asPatient(response.body).documentNumber).toBe('30123456')
  })

  it('stores a passport number in uppercase', async () => {
    const response = await post({
      documentType: 'PASSPORT',
      documentNumber: 'aab 123',
    })

    expect(response.status).toBe(201)
    expect(asPatient(response.body).documentNumber).toBe('AAB123')
  })

  it('reports the missing required fields in Spanish', async () => {
    const response = await request(app).post('/api/patients').send({})

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({
      firstName: 'El nombre es obligatorio',
      lastName: 'El apellido es obligatorio',
      documentType: 'Elegí un tipo de documento válido',
      documentNumber: 'El número de documento es obligatorio',
      phone: 'El teléfono es obligatorio',
    })
  })

  it('rejects a DNI with letters', async () => {
    const response = await post({ documentNumber: '30A123' })

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({
      documentNumber: 'El DNI solo puede tener números',
    })
  })

  it('rejects an invalid email', async () => {
    const response = await post({ email: 'ana@' })

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({ email: 'El email no es válido' })
  })

  it('rejects a document that already exists, written another way', async () => {
    await createPatient({ documentNumber: '30123456' })

    const response = await post({
      firstName: 'Otra',
      documentNumber: '30.123.456',
    })

    expect(response.status).toBe(409)
    expect(asMessage(response.body)).toBe(
      'Ya existe un paciente con ese documento',
    )
  })

  it('accepts the same number with a different document type', async () => {
    await createPatient({ documentType: 'DNI', documentNumber: '123456' })

    const response = await post({
      documentType: 'PASSPORT',
      documentNumber: '123456',
    })

    expect(response.status).toBe(201)
  })

  describe('with an insurance plan', () => {
    it('creates the patient with an active plan and a member number', async () => {
      const plan = await createPlan()

      const response = await post({
        insurancePlanId: plan.id,
        memberNumber: '123456/01',
      })

      expect(response.status).toBe(201)
      expect(asPatient(response.body)).toMatchObject({
        insurancePlanId: plan.id,
        memberNumber: '123456/01',
      })
    })

    it('requires a member number', async () => {
      const plan = await createPlan()

      const response = await post({ insurancePlanId: plan.id })

      expect(response.status).toBe(400)
      expect(asErrors(response.body)).toEqual({
        memberNumber:
          'El número de afiliado es obligatorio si el paciente tiene plan',
      })
    })

    it('rejects a plan that does not exist', async () => {
      const response = await post({ insurancePlanId: 999, memberNumber: '1' })

      expect(response.status).toBe(400)
      expect(asErrors(response.body)).toEqual({
        insurancePlanId: 'El plan elegido no existe',
      })
    })

    it('rejects an inactive plan', async () => {
      const plan = await createPlan({ isActive: false })

      const response = await post({
        insurancePlanId: plan.id,
        memberNumber: '1',
      })

      expect(response.status).toBe(400)
      expect(asErrors(response.body)).toEqual({
        insurancePlanId: 'El plan elegido no está activo',
      })
    })
  })
})

describe('PUT /api/patients/:id', () => {
  it('updates the patient and persists the changes', async () => {
    const created = await createPatient()

    const response = await put(created.id, { phone: '+5491199999999' })
    const stored = await request(app).get(`/api/patients/${created.id}`)

    expect(response.status).toBe(200)
    expect(asPatient(stored.body).phone).toBe('+5491199999999')
  })

  it('keeps a plan that was deactivated after it was assigned', async () => {
    const plan = await createPlan()
    const created = await createPatient({
      insurancePlanId: plan.id,
      memberNumber: '1',
    })
    await prisma.insurancePlan.update({
      where: { id: plan.id },
      data: { isActive: false },
    })

    const response = await put(created.id, {
      insurancePlanId: plan.id,
      memberNumber: '1',
      address: 'Nueva dirección 123',
    })

    expect(response.status).toBe(200)
    expect(asPatient(response.body).insurancePlanId).toBe(plan.id)
  })

  it('rejects switching to an inactive plan', async () => {
    const created = await createPatient()
    const plan = await createPlan({ isActive: false })

    const response = await put(created.id, {
      insurancePlanId: plan.id,
      memberNumber: '1',
    })

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({
      insurancePlanId: 'El plan elegido no está activo',
    })
  })

  it('rejects the document of another patient', async () => {
    await createPatient({ documentNumber: '20111222' })
    const ana = await createPatient({ documentNumber: '30123456' })

    const response = await put(ana.id, { documentNumber: '20.111.222' })

    expect(response.status).toBe(409)
  })

  it('returns 404 when the patient does not exist', async () => {
    const response = await put(999)

    expect(response.status).toBe(404)
  })

  it('returns 400 when the body is invalid', async () => {
    const created = await createPatient()

    const response = await put(created.id, { firstName: '' })

    expect(response.status).toBe(400)
    expect(asErrors(response.body)).toEqual({
      firstName: 'El nombre es obligatorio',
    })
  })
})

describe('DELETE /api/patients/:id', () => {
  it('does not exist, because the clinical history must be kept', async () => {
    const created = await createPatient()

    const response = await request(app).delete(`/api/patients/${created.id}`)

    expect(response.status).toBe(404)
  })
})
