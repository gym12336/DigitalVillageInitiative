// 文件文本抽取：按扩展名分派，把可解析文件抽成纯文本喂 AI 提取。
// 解析库依赖注入（opts.parsers），便于单测 mock、不在测试里真的加载重库。
// 音视频/图片等不可解析类型：抽文本会抛错，调用方降级为「存储即可」。

// 喂 LLM 前的文本上限（字符数）。超长截断，避免撑爆 token。
export const EXTRACT_TEXT_MAX = 20_000

// 扩展名 → kind 分档。image/av 仅存储；doc/table 可抽文本。
const EXT_KIND = {
  jpg: 'image', jpeg: 'image', png: 'image', webp: 'image', gif: 'image', bmp: 'image',
  mp4: 'av', mov: 'av', avi: 'av', mkv: 'av', webm: 'av', mp3: 'av', wav: 'av', m4a: 'av', aac: 'av',
  txt: 'doc', md: 'doc', docx: 'doc', pdf: 'doc',
  csv: 'table', xlsx: 'table', xls: 'table',
}

/** 取小写扩展名（无扩展名返回 ''）。 */
function extOf(filename) {
  const s = String(filename || '')
  const dot = s.lastIndexOf('.')
  if (dot < 0 || dot === s.length - 1) return ''
  return s.slice(dot + 1).toLowerCase()
}

/** 文件分档：image / av / doc / table / other。 */
export function kindOf(filename) {
  return EXT_KIND[extOf(filename)] || 'other'
}

/** 是否可抽文本（仅 doc / table 档）。 */
export function isParsable(filename) {
  const k = kindOf(filename)
  return k === 'doc' || k === 'table'
}

function clamp(text) {
  const s = String(text || '')
  if (s.length > EXTRACT_TEXT_MAX) {
    return { text: s.slice(0, EXTRACT_TEXT_MAX), truncated: true }
  }
  return { text: s, truncated: false }
}

/**
 * 抽出文件的纯文本。
 * @param {Buffer} buffer - 文件内容
 * @param {string} filename - 用于判定类型的文件名（带扩展名）
 * @param {object} [opts]
 * @param {object} [opts.parsers] - 注入解析库 { mammoth, pdfParse, papaparse, xlsx }；缺省动态导入真实库
 * @returns {Promise<{text: string, truncated: boolean}>}
 */
export async function extractText(buffer, filename, opts = {}) {
  const ext = extOf(filename)
  const parsers = opts.parsers || {}

  switch (ext) {
    case 'txt':
    case 'md':
      return clamp(buffer.toString('utf8'))

    case 'docx': {
      const mammoth = parsers.mammoth || (await import('mammoth')).default
      const { value } = await mammoth.extractRawText({ buffer })
      return clamp(value)
    }

    case 'pdf': {
      const pdfParse = parsers.pdfParse || (await import('pdf-parse')).default
      const { text } = await pdfParse(buffer)
      return clamp(text)
    }

    case 'csv': {
      const papaparse = parsers.papaparse || (await import('papaparse')).default
      const { data } = papaparse.parse(buffer.toString('utf8'), { skipEmptyLines: true })
      const rows = Array.isArray(data) ? data.map((row) => (Array.isArray(row) ? row.join('\t') : String(row))) : []
      return clamp(rows.join('\n'))
    }

    case 'xls':
    case 'xlsx': {
      const xlsx = parsers.xlsx || (await import('xlsx')).default
      const wb = xlsx.read(buffer, { type: 'buffer' })
      const parts = wb.SheetNames.map((name) => xlsx.utils.sheet_to_csv(wb.Sheets[name]))
      return clamp(parts.join('\n'))
    }

    default:
      throw new Error(`无法解析该文件类型：${ext || '(无扩展名)'}`)
  }
}
