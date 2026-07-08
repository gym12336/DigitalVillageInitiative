// Express 入口：读 .env、建库迁移、组装 app、监听端口。
// 生产期额外托管前端 dist/（同源，无需 CORS）。
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import express from 'express'
import { getDb } from './db/connection.js'
import { migrate } from './db/migrate.js'
import { createApp } from './app.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// 读 .env（Node 20.6+ 内置，无需 dotenv）。缺文件不报错，用默认。
try {
  process.loadEnvFile(join(__dirname, '..', '.env'))
} catch {
  /* .env 可选 */
}

const PORT = process.env.PORT || 3001
const SECRET = process.env.JWT_SECRET
if (!SECRET) {
  console.error('缺少 JWT_SECRET（在 .env 中配置）')
  process.exit(1)
}

const db = getDb()
migrate(db)

const app = createApp({ db, secret: SECRET })

// 生产：托管构建产物 dist/，SPA 回退到 index.html。
const distDir = join(__dirname, '..', 'dist')
if (existsSync(distDir)) {
  app.use(express.static(distDir))
  // Express 5：命名通配符替代旧的 '*'。SPA 深链接回退到 index.html。
  app.get('/*splat', (_req, res) => res.sendFile(join(distDir, 'index.html')))
}

app.listen(PORT, () => {
  console.log(`后端已启动：http://localhost:${PORT}`)
})
