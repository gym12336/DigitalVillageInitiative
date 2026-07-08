// 组装 Express app（不监听端口，便于 supertest 直接测）。
import express from 'express'
import { makeAuthRouter } from './routes/auth.js'
import { makeTeamsRouter } from './routes/teams.js'
import { makeDossiersRouter } from './routes/dossiers.js'
import { makePlanRouter } from './routes/plan.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

/**
 * 造 app。
 * @param {object} deps - { db, secret }
 */
export function createApp({ db, secret }) {
  const app = express()
  app.use(express.json({ limit: '1mb' })) // 请求体上限，防撑爆

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.use('/api/auth', makeAuthRouter(db, secret))
  app.use('/api/teams', makeTeamsRouter(db, secret))
  app.use('/api/dossiers', makeDossiersRouter(db, secret))
  app.use('/api/plan', makePlanRouter(db, secret))

  app.use('/api', notFound) // 未匹配的 /api 走 404
  app.use(errorHandler) // 统一错误出口，必须最后挂
  return app
}
