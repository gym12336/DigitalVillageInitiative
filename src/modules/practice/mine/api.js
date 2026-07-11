// 前端 API 客户端：薄封装 fetch，自动带 Authorization 头，统一解 { error }。
// 所有「我的实践」后端接口调用集中在此，视图/dossier.js 不直接碰 fetch。
// 设计见 2026-07-07-my-practice-backend-design.md §4。

const TOKEN_KEY = 'sx.mine.token'

// token 存 localStorage（跨刷新持久）。无 window 的测试环境退化为内存变量。
let memoryToken = ''

/** 读当前 token。无则返回 ''。 */
export function getToken() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      return localStorage.getItem(TOKEN_KEY) || ''
    }
  } catch {
    /* 隐私模式等：降级到内存 */
  }
  return memoryToken
}

/** 存 token；传空串则清除。 */
export function setToken(token) {
  memoryToken = token || ''
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    }
  } catch {
    /* 降级到内存 */
  }
}

/** 抛一个带 status 的错误，供调用方按状态码分支（如 401 触发重新登录）。 */
function apiError(status, message) {
  const err = new Error(message || '请求失败')
  err.status = status
  return err
}

/**
 * 核心请求。自动带 JSON 头 + Authorization；统一解析 { error }。
 * @param {string} path - 以 /api 开头的路径
 * @param {object} [opts] - { method, body }
 */
export async function request(path, { method = 'GET', body } = {}) {
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
    // 网络层失败（断网/后端未起）：给一个可读消息，status 用 0 表示「没到服务器」。
    throw apiError(0, '无法连接服务器，请检查网络或后端是否启动')
  }

  // 204 或空体：直接返回 null，避免 res.json() 抛错。
  const text = await res.text()
  const data = text ? safeParse(text) : null

  if (!res.ok) {
    const message = (data && data.error) || `请求失败（${res.status}）`
    throw apiError(res.status, message)
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

// —— 认证域 ——

export function apiRegister(payload) {
  return request('/api/auth/register', { method: 'POST', body: payload })
}
export function apiLogin(payload) {
  return request('/api/auth/login', { method: 'POST', body: payload })
}
export function apiMe() {
  return request('/api/auth/me')
}

// —— 队伍域 ——

/** 列出我加入的队（含 role/成员数/我的档案数）。返回数组。 */
export async function apiListTeams() {
  const data = await request('/api/teams')
  return (data && data.teams) || []
}
/** 建队（返回新队，含 inviteCode）。 */
export async function apiCreateTeam(name) {
  const data = await request('/api/teams', { method: 'POST', body: { name } })
  return data && data.team
}
/** 用邀请码加入（幂等）。返回队详情。 */
export async function apiJoinTeam(inviteCode) {
  const data = await request('/api/teams/join', { method: 'POST', body: { inviteCode } })
  return data && data.team
}
/** 取单队详情（含 inviteCode 供分享）。 */
export async function apiGetTeam(teamId) {
  const data = await request(`/api/teams/${encodeURIComponent(teamId)}`)
  return data && data.team
}
/** 队员列表（含每人档案计数）。返回数组。 */
export async function apiTeamMembers(teamId) {
  const data = await request(`/api/teams/${encodeURIComponent(teamId)}/members`)
  return (data && data.members) || []
}
/** 退队。 */
export function apiLeaveTeam(teamId) {
  return request(`/api/teams/${encodeURIComponent(teamId)}/leave`, { method: 'DELETE' })
}

// —— 档案域（多队：列表/建档/导入显式带 teamId）——

/** 列表（轻量，含预览字段 idea/village/topic/targetVillage）。返回数组。 */
export async function apiListDossiers(teamId) {
  const data = await request(`/api/dossiers?teamId=${encodeURIComponent(teamId)}`)
  return (data && data.dossiers) || []
}
/** 取单份完整档案。 */
export async function apiGetDossier(id) {
  const data = await request(`/api/dossiers/${encodeURIComponent(id)}`)
  return data && data.dossier
}
/** 新建到指定队（dossier 是完整对象，含前端 id；teamId 单独带）。返回落库的档案。 */
export async function apiCreateDossier(teamId, dossier) {
  const data = await request('/api/dossiers', { method: 'POST', body: { ...dossier, teamId } })
  return data && data.dossier
}
/** 全量更新。返回更新后的档案。 */
export async function apiUpdateDossier(id, dossier) {
  const data = await request(`/api/dossiers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: dossier,
  })
  return data && data.dossier
}
/** 删除。 */
export function apiDeleteDossier(id) {
  return request(`/api/dossiers/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
/** 一次性迁移导入到指定队。返回 { imported, ids }。 */
export function apiImportDossiers(teamId, dossiers) {
  return request('/api/dossiers/import', { method: 'POST', body: { teamId, dossiers } })
}

// —— 方案生成域 ——

/**
 * 请求生成方案（LLM 主 + 规则兜底由后端统一编排）。
 * 后端 HTTP 恒 200：拿到坏输出/没 key/超时时会静默回落，plan.source 标出来源。
 * 401 走既有登录门禁；网络断（status 0）由调用方兜到前端本地模板。
 */
export async function apiGeneratePlan({ idea, refs, village, topic, startDate, endDate } = {}) {
  const data = await request('/api/plan/generate', {
    method: 'POST',
    body: { idea, refs, village, topic, startDate, endDate },
  })
  return data && data.plan
}

// —— 搜索域 ——

/**
 * 联网搜索目标村信息。失败返回空。
 */
export async function apiSearchWeb({ village, idea } = {}) {
  try {
    const data = await request('/api/search/web', {
      method: 'POST',
      body: { village, idea },
    })
    return data || { results: [], overview: null }
  } catch {
    return { results: [], overview: null }
  }
}
