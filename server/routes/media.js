// 实践材料上传路由：上传存储 + 文本档解析。全部需登录。
// 归属校验：只有该 dossier 所属队成员才能给它传材料。
import { Router } from 'express'
import multer from 'multer'
import { makeAuth } from '../middleware/auth.js'
import { assertMember } from '../services/teamService.js'
import { storeFile, SIZE_LIMITS } from '../services/mediaService.js'
import { extractText, isParsable, kindOf } from '../lib/fileText.js'
import { extractFromText } from '../services/practiceExtractService.js'
import { summarize } from '../services/practiceSummaryService.js'
import { describeImage } from '../services/imageDescribeService.js'
import { importZip } from '../services/zipImportService.js'
import { httpError } from '../lib/validate.js'

const EXTRACT_TEXT_LIMIT = 20_000
const ZIP_MAX = 100 * 1024 * 1024 // 压缩包硬顶 100MB

// multer 把 originalname 按 latin1 解码，中文名会乱码。这里重新按 utf8 解回。
// 仅在字符串确实是「latin1 化的 utf8」时生效；已是正常字符串则原样返回。
function fixName(name) {
  const s = String(name || '')
  try {
    const decoded = Buffer.from(s, 'latin1').toString('utf8')
    // 若解出的串再编码回 latin1 与原串一致，说明原串确是被 latin1 误解的 utf8。
    return Buffer.from(decoded, 'utf8').toString('latin1') === s ? decoded : s
  } catch {
    return s
  }
}

// 内存存储：拿到 buffer 后交给 mediaService 按 kind 分档校验再落盘。
// multer 层只设最大档（音视频 200MB）作硬顶，细分档在 service 层。
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: SIZE_LIMITS.av },
})

// ZIP 导入专用：单独 100MB 硬顶（细分档在 zipImportService 内校验）。
const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: ZIP_MAX },
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
      req.file.originalname = fixName(req.file.originalname)
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
      req.file.originalname = fixName(req.file.originalname)
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

  // 上传文本档：存盘 + 抽文本，一趟往返。用于「AI 帮你理素材」——
  // 文件既进材料清单（media 有可查看 url），又拿到 text 喂后续 AI 提取。
  // 仅 doc/table 可解析，其余 422（不存盘，避免脏文件）。
  router.post('/extract-and-store', upload.single('file'), async (req, res, next) => {
    try {
      const dossierId = req.body?.dossierId
      if (!dossierId) throw httpError(400, '缺少 dossierId')
      if (!req.file) throw httpError(400, '缺少上传文件')
      req.file.originalname = fixName(req.file.originalname)
      assertDossierMember(db, req.user, dossierId)

      if (!isParsable(req.file.originalname)) {
        throw httpError(422, '该文件类型无法自动解析文本')
      }
      const media = await storeFile({ baseDir: uploadDir, dossierId, file: req.file })
      const { text, truncated } = await extractText(req.file.buffer, req.file.originalname)
      res.status(201).json({ media, text, truncated })
    } catch (e) {
      next(e)
    }
  })

  // AI 结构化提取：body { text }，返回待审校的人物/指标/材料要点。
  // 恒 200：无 key/网络断/超时时 service 静默回落空结果，source 标出来源。
  router.post('/extract', async (req, res, next) => {
    try {
      const text = String(req.body?.text || '')
      if (!text.trim()) throw httpError(400, '缺少待提取文本')
      if (text.length > EXTRACT_TEXT_LIMIT) throw httpError(413, '文本过长')
      const result = await extractFromText(text)
      res.json(result)
    } catch (e) {
      next(e)
    }
  })

  // 成果综述生成：body { people, metricValues, materials, topic, village }，
  // 返回 { summary, highlights, source }。恒 200：无数据/无 key/失败回落空，不抛。
  router.post('/summarize', async (req, res, next) => {
    try {
      const b = req.body || {}
      const result = await summarize({
        people: Array.isArray(b.people) ? b.people : [],
        metricValues: Array.isArray(b.metricValues) ? b.metricValues : [],
        materials: Array.isArray(b.materials) ? b.materials : [],
        topic: b.topic,
        village: b.village,
      })
      res.json(result)
    } catch (e) {
      next(e)
    }
  })

  // 图片轻量描述：multipart 传图，返回一句图注。
  // 恒 200：模型不支持视觉/无 key/失败时 service 返回 { available:false, reason }，不抛。
  router.post('/describe-image', upload.single('file'), async (req, res, next) => {
    try {
      const dossierId = req.body?.dossierId
      if (!dossierId) throw httpError(400, '缺少 dossierId')
      if (!req.file) throw httpError(400, '缺少上传文件')
      req.file.originalname = fixName(req.file.originalname)
      assertDossierMember(db, req.user, dossierId)

      if (kindOf(req.file.originalname) !== 'image') {
        throw httpError(422, '仅支持图片文件')
      }
      const result = await describeImage(req.file.buffer, req.file.originalname)
      res.json(result)
    } catch (e) {
      next(e)
    }
  })

  // ZIP 整包导入：解压 + 归类 + 文本档自动抽取。用独立 multer 实例（100MB 硬顶）。
  router.post('/import-zip', uploadZip.single('file'), async (req, res, next) => {
    try {
      const dossierId = req.body?.dossierId
      if (!dossierId) throw httpError(400, '缺少 dossierId')
      if (!req.file) throw httpError(400, '缺少上传文件')
      assertDossierMember(db, req.user, dossierId)

      const result = await importZip(req.file.buffer, { dossierId, baseDir: uploadDir })
      res.status(201).json(result)
    } catch (e) {
      next(e)
    }
  })

  return router
}
