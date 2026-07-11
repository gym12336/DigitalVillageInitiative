// 乡村之声前端 API 客户端:薄封装 fetch,统一解 { error }。
// 只读 + 计数,无需登录,故不带 Authorization 头。base = /api/voice。

function apiError(status, message) {
  const err = new Error(message || '请求失败')
  err.status = status
  return err
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw apiError(0, '无法连接服务器,请检查网络或后端是否启动')
  }

  const text = await res.text()
  const data = text ? safeParse(text) : null
  if (!res.ok) {
    throw apiError(res.status, (data && data.error) || `请求失败(${res.status})`)
  }
  return data
}

function safeParse(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

/** 需求列表(带 q/type/status/sort/page/pageSize)。返回 { demands, total, ... }。 */
export function listDemands(params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v !== '' && v != null) qs.set(k, v)
  }
  const query = qs.toString()
  return request(`/api/voice${query ? `?${query}` : ''}`)
}

/** 单条需求详情。返回 demand 对象;404 抛错(err.status===404)。 */
export async function getDemand(id) {
  const data = await request(`/api/voice/${encodeURIComponent(id)}`)
  return data && data.demand
}

/** 浏览数 +1。返回更新后的 demand。 */
export async function incrementView(id) {
  const data = await request(`/api/voice/${encodeURIComponent(id)}/view`, { method: 'POST' })
  return data && data.demand
}

/** 收藏增减,delta = 1 | -1。返回更新后的 demand。 */
export async function adjustFavorite(id, delta) {
  const data = await request(`/api/voice/${encodeURIComponent(id)}/favorite`, {
    method: 'POST',
    body: { delta },
  })
  return data && data.demand
}

/** 问答列表。返回数组。 */
export async function listQa() {
  const data = await request('/api/voice/qa')
  return (data && data.qa) || []
}
