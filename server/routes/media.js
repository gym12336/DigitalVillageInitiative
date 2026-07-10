// 实践材料上传路由：上传存储 + 文本档解析。全部需登录。
// 归属校验：只有该 dossier 所属队成员才能给它传材料。
import { Router } from 'express'
import multer from 'multer'
import { makeAuth } from '../middleware/auth.js'
import { assertMember } from '../services/teamService.js'
import { storeFile, SIZE_LIMITS } from '../services/mediaService.js'
import { extractText, isParsable } from '../lib/fileText.js'
import { httpError } from '../lib/validate.js'

// 内存存储：拿到 buffer 后交给 mediaService 按 kind 分档校验再落盘。
// multer 层只设最大档（音视频 200MB）作硬顶，细分档在 service 层。
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SIZE_LIMITS.av },
})

/** 校验用户是 dossier 所属队成员。返回 dossier 行。 */
function assertDossierMember(db, user, dossierId) {
  const row = db.prepare('SELECT team_id FROM dossiers WHERE id = ?').get(dossierId)
  if (!row) throw httpError(404, '档案不存在')
  assertMember(db, user.id, row.team_id)
  return row
}

/**
 * @param {object} deps
 * @param {import('better-sqlite3').Database} deps.db
 * @param {string} deps.secret
 * @param {string} deps.uploadDir - uploads/practice 绝对目录
 */
export function makeMediaRouter({ db, secret, uploadDir }) {
  const router = Router()
  router.use(makeAuth(secret, db))

  // 上传材料：multipart，field 名 file，body 带 dossierId。
  router.post('/', upload.single('file'), async (req, res, next) => {
    try {
      const dossierId = req.body?.dossierId
      if (!dossierId) throw httpError(400, '缺少 dossierId')
      if (!req.file) throw httpError(400, '缺少上传文件')
      assertDossierMember(db, req.user, dossierId)

      const media = await storeFile({ baseDir: uploadDir, dossierId, file: req.file })
      res.status(201).json({ media })
    } catch (e) {
      next(e)
    }
  })

  // 上传并抽文本：仅 doc/table 可解析，其余 422。用于 AI 提取前置。
  router.post('/extract-text', upload.single('file'), async (req, res, next) => {
    try {
      const dossierId = req.body?.dossierId
      if (!dossierId) throw httpError(400, '缺少 dossierId')
      if (!req.file) throw httpError(400, '缺少上传文件')
      assertDossierMember(db, req.user, dossierId)

      if (!isParsable(req.file.originalname)) {
        throw httpError(422, '该文件类型无法自动解析文本')
      }
      const { text, truncated } = await extractText(req.file.buffer, req.file.originalname)
      res.json({ text, truncated })
    } catch (e) {
      next(e)
    }
  })

  return router
}
