import { afterAll, beforeEach } from 'vitest'

import { existsSync } from 'node:fs'

if (existsSync('.env.test')) process.loadEnvFile('.env.test')

// Every test truncates the database, so refuse to run against anything that
// is not a test database. This keeps the development data safe.
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  throw new Error('DATABASE_URL is missing. Create server/.env.test')
}

const databaseName = new URL(databaseUrl).pathname.slice(1)
if (!databaseName.endsWith('_test')) {
  throw new Error(
    `Tests must run against a test database, but DATABASE_URL points to "${databaseName}"`,
  )
}

const { prisma } = await import('../prisma')

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE patients, insurance_plans, insurers RESTART IDENTITY CASCADE`,
  )
})

afterAll(async () => {
  await prisma.$disconnect()
})
