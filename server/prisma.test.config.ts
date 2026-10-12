import { defineConfig, env } from 'prisma/config'

import { existsSync } from 'node:fs'

if (existsSync('.env.test')) process.loadEnvFile('.env.test')

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
})
