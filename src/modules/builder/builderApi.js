// 搭建台 API 客户端。token 机制与 practice/mine/api.js 共享（同一 TOKEN_KEY）。
const TOKEN_KEY = 'sx.mine.token'

let memoryToken = ''

export function getToken() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      return localStorage.getItem(TOKEN_KEY) || ''
    }
  } catch { /* 隐私模式降级 */ }
  return memoryToken
}

export function setToken(token) {
  memoryToken = token || ''
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    }
  } catch { /* 降级到内存 */ }
}

function apiError(status, message) {
  const err = new Error(message || '请求失败')
  err.status = status
  return err
}

function safeParse(text) {
  try { return JSON.parse(text) } catch { return null }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw apiError(0, '无法连接服务器，请检查网络或后端是否启动')
  }

  const text = await res.text()
  const data = text ? safeParse(text) : null

  if (!res.ok) {
    const message = (data && data.error) || `请求失败（${res.status}）`
    throw apiError(res.status, message)
  }
  return data
}

// —— 搭建台文档域 ——

/** 列出某 dossier 下指定类型的文档。 */
export async function apiLoadDocuments(dossierId, type) {
  const data = await request(
    `/api/builder/${encodeURIComponent(dossierId)}/documents?type=${encodeURIComponent(type)}`,
  )
  return (data && data.documents) || []
}

/** 创建或覆盖文档。返回落库的 document。 */
export async function apiSaveDocument(dossierId, { type, name, payload, id } = {}) {
  const data = await request(
    `/api/builder/${encodeURIComponent(dossierId)}/documents`,
    { method: 'POST', body: { type, name, payload, id } },
  )
  return data && data.document
}

/** 删除文档（仅 big-component）。 */
export function apiDeleteDocument(id) {
  return request(`/api/builder/documents/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
