import express, { type ErrorRequestHandler } from 'express'
import cors from 'cors'
import { prisma } from './prisma'
import { insurersRouter } from './modules/insurers/insurers.routes'
import { patientsRouter } from './modules/patients/patients.routes'

export const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/insurers', insurersRouter)
app.use('/api/patients', patientsRouter)

app.get('/api/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'ok' })
  } catch (error) {
    console.error(error)
    res.status(503).json({ status: 'error', database: 'unreachable' })
  }
})

// Must come after every route: only unmatched requests reach it.
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' })
})

const isJsonParseError = (error: unknown) =>
  error instanceof SyntaxError &&
  'type' in error &&
  error.type === 'entity.parse.failed'

// Express recognizes an error handler by its four parameters.
const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (isJsonParseError(error)) {
    res.status(400).json({ message: 'Request body is not valid JSON' })
    return
  }

  console.error(error)
  res.status(500).json({ message: 'Internal server error' })
}

app.use(errorHandler)
