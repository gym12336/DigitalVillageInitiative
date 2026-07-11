// 实践材料上传存储：按 dossierId 分目录写盘，按类型分档限制大小。
// 纯存储，无 AI。文本档的解析交给 lib/fileText.js。
// fs 依赖注入（fsImpl），便于单测不真正写盘。
import { promises as realFs } from 'node:fs'
import path from 'node:path'
import { kindOf } from '../lib/fileText.js'
import { httpError } from '../lib/validate.js'
import { genId } from '../lib/genId.js'

// 按 kind 分档的大小上限（字节）。
export const SIZE_LIMITS = {
  av: 200 * 1024 * 1024, // 音视频 200MB
  image: 20 * 1024 * 1024, // 图片 20MB
  doc: 10 * 1024 * 1024, // 文本档 10MB
  table: 10 * 1024 * 1024, // 表格 10MB
  other: 20 * 1024 * 1024, // 其他 20MB
}

/** 取小写扩展名。 */
function extOf(filename) {
  const s = String(filename || '')
  const dot = s.lastIndexOf('.')
  return dot >= 0 && dot < s.length - 1 ? s.slice(dot + 1).toLowerCase() : ''
}

/**
 * 校验上传：判定 kind/ext，超出该档上限抛 413。
 * @returns {{kind: string, ext: string}}
 */
export function checkUpload(filename, size) {
  const kind = kindOf(filename)
  const ext = extOf(filename)
  const limit = SIZE_LIMITS[kind] ?? SIZE_LIMITS.other
  if (size > limit) {
    const mb = Math.round(limit / 1024 / 1024)
    throw httpError(413, `文件过大，${kind} 类上限 ${mb}MB`)
  }
  return { kind, ext }
}

/**
 * 存储上传文件。先校验大小（超限不写盘），再按 dossierId 分目录、重铸存储名写盘。
 * @param {object} args
 * @param {string} args.baseDir - uploads/practice 绝对目录
 * @param {string} args.dossierId - 归属档案 id（作为子目录）
 * @param {object} args.file - multer 文件对象 { originalname, buffer, size }
 * @param {object} [args.fsImpl] - 注入 fs.promises（mkdir/writeFile），缺省用真实 fs
 * @param {() => string} [args.genName] - 存储名生成器，缺省用 genId
 * @returns {Promise<{url,name,size,ext,kind}>}
 */
export async function storeFile({ baseDir, dossierId, file, fsImpl = realFs, genName = genId }) {
  const { originalname, buffer, size } = file
  const { kind, ext } = checkUpload(originalname, size)

  const dir = path.posix.join(baseDir, String(dossierId))
  await fsImpl.mkdir(dir, { recursive: true })

  // 重铸存储名，防路径穿越/覆盖；保留原扩展名。
  const storeName = ext ? `${genName()}.${ext}` : genName()
  const diskPath = path.posix.join(dir, storeName)
  await fsImpl.writeFile(diskPath, buffer)

  return {
    url: `/uploads/practice/${dossierId}/${storeName}`,
    name: originalname,
    size,
    ext,
    kind,
  }
}
