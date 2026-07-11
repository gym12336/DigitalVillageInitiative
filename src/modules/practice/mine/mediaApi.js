// 材料上传前端封装：multipart 上传 + 文本档解析。
// 复用 api.js 的 token，但走独立的 multipart 请求（api.js 的 request 只发 JSON）。
import { getToken } from './api.js'

function apiError(status, message) {
  const err = new Error(message || '请求失败')
  err.status = status
  return err
}

/** 发一个 multipart 请求（FormData），自动带 Authorization。 */
async function postForm(path, formData) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let res
  try {
    res = await fetch(path, { method: 'POST', headers, body: formData })
  } catch {
    throw apiError(0, '无法连接服务器，请检查网络或后端是否启动')
  }
  const text = await res.text()
  let data = null
  try { data = text ? JSON.parse(text) : null } catch { data = null }
  if (!res.ok) {
    throw apiError(res.status, (data && data.error) || `请求失败（${res.status}）`)
  }
  return data
}

/**
 * 上传一个材料文件。
 * @param {string} dossierId
 * @param {File} file
 * @returns {Promise<{url,name,size,ext,kind}>}
 */
export async function uploadMedia(dossierId, file) {
  const fd = new FormData()
  fd.append('dossierId', dossierId)
  fd.append('file', file)
  const data = await postForm('/api/practice/media', fd)
  return data && data.media
}

/**
 * 上传一个文本档并抽出纯文本（doc/table 类）。不可解析类型后端返回 422。
 * @returns {Promise<{text, truncated}>}
 */
export async function extractUploadedDoc(dossierId, file) {
  const fd = new FormData()
  fd.append('dossierId', dossierId)
  fd.append('file', file)
  return postForm('/api/practice/media/extract-text', fd)
}

/**
 * 上传文本档：一趟往返存盘 + 抽文本。文件既落库（进材料清单，media 带可查看 url），
 * 又返回 text 供后续 AI 提取。不可解析类型后端返回 422（不存盘）。
 * @returns {Promise<{media:{url,name,size,ext,kind}, text, truncated}>}
 */
export async function extractAndStoreDoc(dossierId, file) {
  const fd = new FormData()
  fd.append('dossierId', dossierId)
  fd.append('file', file)
  return postForm('/api/practice/media/extract-and-store', fd)
}

/**
 * 让 AI 描述一张图片，返回一句图注。恒 200：模型不支持/无 key/失败时 available:false。
 * @returns {Promise<{available:boolean, description?:string, reason?:string}>}
 */
export async function describeImage(dossierId, file) {
  const fd = new FormData()
  fd.append('dossierId', dossierId)
  fd.append('file', file)
  return postForm('/api/practice/media/describe-image', fd)
}

/**
 * ZIP 整包导入：解压 + 归类 + 文本档自动 AI 抽取。
 * @returns {Promise<{materials, drafts:{people,metrics,materialHints}, skipped, imported, total}>}
 */
export async function importZip(dossierId, file) {
  const fd = new FormData()
  fd.append('dossierId', dossierId)
  fd.append('file', file)
  return postForm('/api/practice/media/import-zip', fd)
}
