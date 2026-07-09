// 作品存取：后端优先（团队共享、跨设备），失败/无队时回落 localStorage（前端暂存）。
// 参照 dossier.js 的隔离手法——对外 saveWork/loadWork/listWorks 语义稳定，
// 内部按「有没有 teamId + 后端是否可达」决定走后端还是本地。
import { apiListWorks, apiGetWork, apiSaveWork, apiDeleteWork } from './api.js'

const KEY = 'sx.lowcode.works'

// —— 本地暂存（回落层）——
function readAll() {
  try {
    if (typeof localStorage === 'undefined' || !localStorage) return {}
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
function writeAll(map) {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      localStorage.setItem(KEY, JSON.stringify(map))
    }
  } catch {
    /* 隐私模式等：静默降级 */
  }
}
function localSave(work) {
  const map = readAll()
  map[work.id] = { ...work, updatedAt: new Date().toISOString() }
  writeAll(map)
  return map[work.id]
}
function localGet(id) {
  return readAll()[id] || null
}
function localList() {
  return Object.values(readAll()).sort((a, b) =>
    String(b.updatedAt).localeCompare(String(a.updatedAt)),
  )
}
function localRemove(id) {
  const map = readAll()
  delete map[id]
  writeAll(map)
}

// —— 对外 API（async）——
// teamId 为空 → 纯本地（示例/未登录场景，仍可存取与演示）。
// teamId 有值 → 走后端；后端不可达（status 0）时回落本地，不阻断编辑。

/** 保存一份作品。返回落库/暂存后的作品。 */
export async function saveWork(work, teamId) {
  if (!teamId) return localSave(work)
  try {
    return await apiSaveWork(teamId, work)
  } catch (e) {
    if (e.status === 0) return localSave(work) // 断网/后端未起：本地兜底
    throw e
  }
}

/** 读一份作品（无则 null）。 */
export async function loadWork(id, teamId) {
  if (!teamId) return localGet(id)
  try {
    return await apiGetWork(id)
  } catch (e) {
    if (e.status === 404) return null
    if (e.status === 0) return localGet(id)
    throw e
  }
}

/** 列出作品（预览用）。 */
export async function listWorks(teamId) {
  if (!teamId) return localList()
  try {
    return await apiListWorks(teamId)
  } catch (e) {
    if (e.status === 0) return localList()
    throw e
  }
}

/** 删除一份作品。 */
export async function removeWork(id, teamId) {
  if (!teamId) return localRemove(id)
  try {
    await apiDeleteWork(id)
  } catch (e) {
    if (e.status === 0) return localRemove(id)
    throw e
  }
}
