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
