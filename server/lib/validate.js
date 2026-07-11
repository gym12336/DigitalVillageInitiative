// 请求体字段校验。校验失败抛带 status=400 的错误，由 errorHandler 统一出口。
// 纯函数、无依赖，可单测。

/** 造一个带 HTTP 状态码的错误对象。service/lib 用它表达业务失败。 */
export function httpError(status, message, extra) {
  const err = new Error(message)
  err.status = status
  if (extra) Object.assign(err, extra)
  return err
}

const USERNAME_MIN = 3
const USERNAME_MAX = 32
const PASSWORD_MIN = 6
const PASSWORD_MAX = 72 // bcrypt 上限 72 字节
const DISPLAY_NAME_MAX = 32
const TEAM_NAME_MIN = 1
const TEAM_NAME_MAX = 32
// payload 大小上限：单份档案的 JSON 文本字节数。materials 只存元数据，256KB 足够。
export const PAYLOAD_MAX_BYTES = 256 * 1024

function assertString(v, name) {
  if (typeof v !== 'string') throw httpError(400, `${name} 必须是字符串`)
}

/** 校验注册体：{ username, password, displayName? }。返回规范化后的字段。 */
export function validateRegister(body = {}) {
  const { username, password, displayName = '' } = body
  assertString(username, 'username')
  assertString(password, 'password')
  const u = username.trim()
  if (u.length < USERNAME_MIN || u.length > USERNAME_MAX)
    throw httpError(400, `用户名需 ${USERNAME_MIN}~${USERNAME_MAX} 个字符`)
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX)
    throw httpError(400, `密码需 ${PASSWORD_MIN}~${PASSWORD_MAX} 个字符`)
  assertString(displayName, 'displayName')
  if (displayName.length > DISPLAY_NAME_MAX)
    throw httpError(400, `昵称最多 ${DISPLAY_NAME_MAX} 个字符`)
  return { username: u, password, displayName: displayName.trim() }
}

/** 校验登录体：{ username, password }。 */
export function validateLogin(body = {}) {
  const { username, password } = body
  assertString(username, 'username')
  assertString(password, 'password')
  if (!username.trim() || !password) throw httpError(400, '用户名和密码不能为空')
  return { username: username.trim(), password }
}

/** 校验入队体：{ inviteCode }。 */
export function validateJoin(body = {}) {
  const { inviteCode } = body
  assertString(inviteCode, 'inviteCode')
  const code = inviteCode.trim()
  if (!code) throw httpError(400, '邀请码不能为空')
  return { inviteCode: code }
}

/** 校验建队体：{ name }。返回规范化队名。 */
export function validateCreateTeam(body = {}) {
  const { name } = body
  assertString(name, 'name')
  const n = name.trim()
  if (n.length < TEAM_NAME_MIN || n.length > TEAM_NAME_MAX)
    throw httpError(400, `队名需 ${TEAM_NAME_MIN}~${TEAM_NAME_MAX} 个字符`)
  return { name: n }
}

/** 校验并规范化 teamId（来自 query/body/params）。返回正整数或抛 400。 */
export function validateTeamId(raw) {
  const id = Number(raw)
  if (!Number.isInteger(id) || id <= 0) throw httpError(400, '缺少合法的 teamId')
  return id
}

const IDEA_MAX = 500

/** 校验方案生成请求体：idea 必填非空字符串；其他字段可选，非字符串自动降级为空串。 */
export function validatePlanRequest(body = {}) {
  const { idea } = body || {}
  assertString(idea, 'idea')
  const i = idea.trim()
  if (!i) throw httpError(400, 'idea 不能为空')
  if (i.length > IDEA_MAX) throw httpError(400, `idea 长度不能超过 ${IDEA_MAX} 字`)
  const str = (v) => (typeof v === 'string' ? v.trim() : '')
  const refs = Array.isArray(body.refs) ? body.refs : []
  return {
    idea: i,
    refs,
    village: str(body.village),
    topic: str(body.topic),
    startDate: str(body.startDate),
    endDate: str(body.endDate),
  }
}

/**
 * 校验一份档案对象。用于 POST/PUT/import。
 * dossier 主体后端不拆解，只校验：有字符串 id、payload 可序列化且不超上限，
 * 并抽取 title/stage 供冗余列（单一数据源=payload）。
 */
export function validateDossier(dossier) {
  if (!dossier || typeof dossier !== 'object')
    throw httpError(400, '档案必须是对象')
  if (typeof dossier.id !== 'string' || !dossier.id.trim())
    throw httpError(400, '档案缺少合法 id')

  let payload
  try {
    payload = JSON.stringify(dossier)
  } catch {
    throw httpError(400, '档案无法序列化（可能存在循环引用）')
  }
  if (Buffer.byteLength(payload, 'utf8') > PAYLOAD_MAX_BYTES)
    throw httpError(400, `单份档案超过 ${PAYLOAD_MAX_BYTES / 1024}KB 上限`)

  const STAGES = ['plan', 'track', 'result']
  const stage = STAGES.includes(dossier.stage) ? dossier.stage : 'plan'
  const title = typeof dossier.title === 'string' ? dossier.title : ''
  return { id: dossier.id, title, stage, payload }
}

/**
 * 校验一份成果作品对象。用于 POST/PUT（upsert）。
 * 与 validateDossier 同构：字符串 id、payload 可序列化且不超上限；
 * 抽取 title 供冗余列，sourceDossier 记录数据源档案 id（可空）。
 */
export function validateWorkRecord(work) {
  if (!work || typeof work !== 'object')
    throw httpError(400, '作品必须是对象')
  if (typeof work.id !== 'string' || !work.id.trim())
    throw httpError(400, '作品缺少合法 id')

  let payload
  try {
    payload = JSON.stringify(work)
  } catch {
    throw httpError(400, '作品无法序列化（可能存在循环引用）')
  }
  if (Buffer.byteLength(payload, 'utf8') > PAYLOAD_MAX_BYTES)
    throw httpError(400, `单份作品超过 ${PAYLOAD_MAX_BYTES / 1024}KB 上限`)

  const title = typeof work.title === 'string' ? work.title : ''
  const sourceDossier = typeof work.source === 'string' ? work.source : ''
  return { id: work.id, title, sourceDossier, payload }
}
