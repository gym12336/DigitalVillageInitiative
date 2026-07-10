// 图片轻量描述：给一张图，调多模态模型返回一句图注。
// 诚实降级：无 key / 模型不支持视觉 / 网络失败 → 返回 { available:false, reason }，绝不抛。
// 当前 DeepSeek deepseek-chat 不支持图片输入，实际会走降级；换视觉模型（如百炼 qwen-vl）即可启用。
import { chatVision, NoKeyError } from '../lib/deepseek.js'

const SYSTEM = '你是乡村社会实践的材料助手。用一句话（40字内）客观描述图片内容，便于队员归档，不要臆测。'
const PROMPT = '请用一句话描述这张实践材料图片的主要内容。'

// 扩展名 → MIME，构造 data URL。
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp' }

function extOf(name) {
  const s = String(name || '')
  const dot = s.lastIndexOf('.')
  return dot >= 0 && dot < s.length - 1 ? s.slice(dot + 1).toLowerCase() : ''
}

/**
 * 描述一张图片。
 * @param {Buffer} buffer 图片内容
 * @param {string} filename 用于判定 MIME
 * @param {object} [opts] { chatImpl } 注入 chatVision（测试用）
 * @returns {Promise<{available:boolean, description?:string, reason?:string}>}
 */
export async function describeImage(buffer, filename, opts = {}) {
  const mime = MIME[extOf(filename)]
  if (!mime) return { available: false, reason: '不支持的图片格式' }
  if (!buffer || !buffer.length) return { available: false, reason: '空文件' }

  const chatImpl = opts.chatImpl || chatVision
  const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`

  try {
    const description = await chatImpl({ system: SYSTEM, prompt: PROMPT, imageDataUrl: dataUrl })
    const clean = String(description || '').trim()
    if (!clean) return { available: false, reason: '模型未返回描述' }
    return { available: true, description: clean }
  } catch (e) {
    const reason = e instanceof NoKeyError
      ? 'AI 未配置密钥'
      : '当前模型暂不支持图片理解，可后续接入多模态模型'
    console.warn('[imageDescribe] 降级：', e?.message || e)
    return { available: false, reason }
  }
}
