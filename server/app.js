// 组装 Express app（不监听端口，便于 supertest 直接测）。
import express from 'express'
import path from 'node:path'
import { makeAuthRouter } from './routes/auth.js'
import { makeTeamsRouter } from './routes/teams.js'
import { makeDossiersRouter } from './routes/dossiers.js'
import { makeWorksRouter } from './routes/works.js'
import { makePlanRouter } from './routes/plan.js'
import { makeSearchRouter } from './routes/search.js'
import { makeBuilderRouter } from './routes/builder.js'
import { makeMediaRouter } from './routes/media.js'
import { makeVillagesRouter } from './routes/villages.js'
import { makeVoiceRouter } from './routes/voice.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

// 上传根目录缺省：<cwd>/server/uploads/practice。测试注入临时目录。
const DEFAULT_UPLOAD_DIR = path.join(process.cwd(), 'server', 'uploads', 'practice')

/**
 * 造 app。
 * @param {object} deps - { db, secret, uploadDir? }
 */
export function createApp({ db, secret, uploadDir = DEFAULT_UPLOAD_DIR }) {
  const app = express()
  app.use(express.json({ limit: '1mb' })) // 请求体上限，防撑爆

  app.get('/api/health', (_req, res) => res.json({ ok: true }))
  app.use('/api/auth', makeAuthRouter(db, secret))
  app.use('/api/teams', makeTeamsRouter(db, secret))
  app.use('/api/dossiers', makeDossiersRouter(db, secret))
  app.use('/api/works', makeWorksRouter(db, secret))
  app.use('/api/plan', makePlanRouter(db, secret))
  app.use('/api/search', makeSearchRouter(db, secret))
  app.use('/api/builder', makeBuilderRouter(db, secret))
  app.use('/api/practice/media', makeMediaRouter({ db, secret, uploadDir }))
  app.use('/api/villages', makeVillagesRouter(db))
  app.use('/api/voice', makeVoiceRouter(db))

  // 静态托管上传的材料（仅暴露 uploads/practice 下的文件）。
  app.use('/uploads/practice', express.static(uploadDir))

  app.use('/api', notFound) // 未匹配的 /api 走 404
  app.use(errorHandler) // 统一错误出口，必须最后挂
  return app
}
