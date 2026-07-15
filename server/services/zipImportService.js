// ZIP 整包导入：解压 → 安全校验 → 逐文件过现有管线（存盘+归类+文本档抽取）。
// 复用 storeFile / extractText / extractFromText / kindOf / isParsable，本服务只做「解压 + 分发」。
// 依赖注入（deps）便于单测，不真正读 jszip / 写盘。
import JSZip from 'jszip'
import { storeFile } from './mediaService.js'
import { extractText, isParsable } from '../lib/fileText.js'
import { extractFromText } from './practiceExtractService.js'
import { httpError } from '../lib/validate.js'

// 安全限额（稳妥档）。
export const ZIP_LIMITS = {
  maxTotalUncompressed: 300 * 1024 * 1024, // 解压总量 300MB
  maxFiles: 100, // 最多 100 个有效文件
}

const KIND_TO_TYPE = { image: '照片', av: '视频', doc: '文档', table: '表格', other: '其他' }

/** 是否应跳过的条目：目录、Mac 元数据、隐藏文件、空名。 */
function shouldSkip(relativePath, isDir) {
  if (isDir) return true
  const name = String(relativePath || '')
  if (!name) return true
  if (name.startsWith('__MACOSX/') || name.includes('/__MACOSX/')) return true
  // 取 basename 判隐藏文件（. 开头，如 .DS_Store）
  const base = name.slice(name.lastIndexOf('/') + 1)
  if (!base || base.startsWith('.')) return true
  return false
}

/**
 * 导入一个 zip。解压后逐文件存盘归类，文本档跑 AI 抽取。
 * @param {Buffer} buffer - zip 内容
 * @param {object} args
 * @param {string} args.dossierId
 * @param {string} args.baseDir - uploads/practice 绝对目录
 * @param {object} [args.deps] - { jszip, storeFileImpl, extractTextImpl, extractImpl }（测试注入）
 * @returns {Promise<{materials, drafts, skipped, imported, total}>}
 */
export async function importZip(buffer, { dossierId, baseDir, deps = {} } = {}) {
  const zipLib = deps.jszip || JSZip
  const storeImpl = deps.storeFileImpl || storeFile
  const extractTextImpl = deps.extractTextImpl || extractText
  const extractImpl = deps.extractImpl || extractFromText

  let zip
  try {
    zip = await zipLib.loadAsync(buffer)
  } catch {
    throw httpError(400, '压缩包无法解析，请确认是有效的 zip 文件')
  }

  // 收集有效条目（跳过目录/元数据/隐藏）。
  const entries = []
  zip.forEach((relativePath, entry) => {
    if (!shouldSkip(relativePath, entry.dir)) entries.push({ relativePath, entry })
  })

  if (!entries.length) throw httpError(400, '压缩包内没有可导入的文件')
  if (entries.length > ZIP_LIMITS.maxFiles) {
    throw httpError(413, `压缩包内文件过多（${entries.length}），上限 ${ZIP_LIMITS.maxFiles} 个`)
  }

  const materials = []
  const drafts = { people: [], metrics: [], materialHints: [], places: [] }
  const skipped = []
  let totalBytes = 0

  for (const { relativePath, entry } of entries) {
    const name = relativePath.slice(relativePath.lastIndexOf('/') + 1)
    let buf
    try {
      buf = await entry.async('nodebuffer')
    } catch {
      skipped.push({ name, reason: '无法读取' })
      continue
    }
    if (!buf || !buf.length) {
      skipped.push({ name, reason: '空文件' })
      continue
    }

    totalBytes += buf.length
    if (totalBytes > ZIP_LIMITS.maxTotalUncompressed) {
      const mb = Math.round(ZIP_LIMITS.maxTotalUncompressed / 1024 / 1024)
      throw httpError(413, `解压后总大小超过 ${mb}MB 上限`)
    }

    // 存盘 + 归类（storeFile 内部按分档校验大小，超限抛错 → 记 skipped 继续）。
    let media
    try {
      media = await storeImpl({ baseDir, dossierId, file: { originalname: name, buffer: buf, size: buf.length } })
    } catch (e) {
      skipped.push({ name, reason: e?.message || '存储失败' })
      continue
    }

    const item = {
      type: KIND_TO_TYPE[media.kind] || '其他',
      name: media.name,
      note: '',
      url: media.url,
      kind: media.kind,
      ext: media.ext,
    }

    // 文本档：抽文本 + AI 抽取（失败不阻断，仅跳过抽取）。
    if (isParsable(name)) {
      try {
        const { text } = await extractTextImpl(buf, name)
        item.text = text || ''
        if (text && text.trim()) {
          const r = await extractImpl(text)
          pushDrafts(drafts, r, media.name)
        }
      } catch {
        // 解析/抽取失败：材料仍入清单，只是没有解析文本与抽取草稿。
      }
    }

    materials.push(item)
  }

  return { materials, drafts, skipped, imported: materials.length, total: entries.length }
}

/** 把一次抽取结果并入 drafts，标来源文件名。 */
function pushDrafts(drafts, r, sourceFile) {
  for (const p of r.people || []) drafts.people.push({ ...p, sourceFile })
  for (const m of r.metrics || []) drafts.metrics.push({ ...m, sourceFile })
  for (const h of r.materialHints || []) drafts.materialHints.push({ ...h, sourceFile })
  for (const p of r.places || []) drafts.places.push({ ...p, sourceFile })
}
