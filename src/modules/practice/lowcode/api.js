// 低代码成果作品的 API 客户端：薄封装 fetch。复用「我的实践」的 token 机制
// （同一登录态），把作品域调用集中在此，worksStore 不直接碰 fetch。
import { getToken } from '../mine/api.js'

function apiError(status, message) {
  const err = new Error(message || '请求失败')
  err.status = status
  return err
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
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }
  if (!res.ok) {
    throw apiError(res.status, (data && data.error) || `请求失败（${res.status}）`)
  }
  return data
}

/** 列出某队全部作品（轻量预览）。返回数组。 */
export async function apiListWorks(teamId) {
  const data = await request(`/api/works?teamId=${encodeURIComponent(teamId)}`)
  return (data && data.works) || []
}

/** 取单份作品完整数据。 */
export async function apiGetWork(id) {
  const data = await request(`/api/works/${encodeURIComponent(id)}`)
  return data && data.work
}

/** 保存作品（upsert）：body 带 teamId + 作品对象。返回落库的作品。 */
export async function apiSaveWork(teamId, work) {
  const data = await request('/api/works', { method: 'POST', body: { ...work, teamId } })
  return data && data.work
}

/** 删除作品。 */
export function apiDeleteWork(id) {
  return request(`/api/works/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

