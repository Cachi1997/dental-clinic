import { describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { app } from './app'
import { prisma } from './prisma'

describe('GET /api/health', () => {
  it('returns ok when the database is reachable', async () => {
    const response = await request(app).get('/api/health')

    expect(response.status).toBe(200)
    expect(response.body).toEqual({ status: 'ok', database: 'ok' })
  })

  it('returns 503 when the database is unreachable', async () => {
    vi.spyOn(prisma, '$queryRaw').mockRejectedValueOnce(new Error('down'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await request(app).get('/api/health')

    expect(response.status).toBe(503)
    expect(response.body).toEqual({ status: 'error', database: 'unreachable' })
  })
})
