// 前端登录态：管 token（经 api.js 存取）+ 响应式 user，封装注册/登录/登出/恢复
// 以及队伍编排（建队/加入/刷新我的队）。多队后 user 含 teams[]，队伍中枢据此渲染。
// 设计见 2026-07-08-teams-multi-membership-design.md §4。
import { ref, computed } from 'vue'
import {
  getToken,
  setToken,
  apiRegister,
  apiLogin,
  apiMe,
  apiListTeams,
  apiCreateTeam,
  apiJoinTeam,
} from './api.js'

// 全模块共享的单例响应式登录态。
const currentUser = ref(null) // { id, username, displayName, teams: [...] } | null
const ready = ref(false) // 是否已尝试过恢复登录态（防门禁在恢复前闪登录页）

export { currentUser, ready }

/** 已登录（有 user）。 */
export const isAuthed = computed(() => currentUser.value != null)
/** 我加入的队列表（响应式）。未登录为 []。 */
export const myTeams = computed(() => currentUser.value?.teams || [])
/** 是否已加入至少一个队。 */
export const hasAnyTeam = computed(() => myTeams.value.length > 0)

// 收到 { token, user } 时统一落地：存 token、置 user。
function applyAuth({ token, user }) {
  if (token) setToken(token)
  currentUser.value = user
  return user
}

/** 注册并自动登录。返回 user。 */
export async function register(payload) {
  return applyAuth(await apiRegister(payload))
}

/** 登录。返回 user。 */
export async function login(payload) {
  return applyAuth(await apiLogin(payload))
}

/** 登出：清 token 与 user。 */
export function logout() {
  setToken('')
  currentUser.value = null
}

/** 刷新我的队列表到 currentUser.teams（建队/加入/退队后调）。返回队数组。 */
export async function loadMyTeams() {
  const teams = await apiListTeams()
  if (currentUser.value) {
    // 归一化成 user.teams 的形状（id/name/role），列表接口另含成员数等冗余字段，无妨。
    currentUser.value = {
      ...currentUser.value,
      teams: teams.map((t) => ({ id: t.id, name: t.name, role: t.role })),
    }
  }
  return teams
}

/** 建队：成功后刷新我的队。返回新队（含 inviteCode）。 */
export async function createTeam(name) {
  const team = await apiCreateTeam(name)
  await loadMyTeams()
  return team
}

/** 用邀请码加入（幂等）：成功后刷新我的队。返回队详情。 */
export async function joinTeam(inviteCode) {
  const team = await apiJoinTeam(inviteCode)
  await loadMyTeams()
  return team
}

/**
 * 应用启动时恢复登录态：有本地 token 就调 /me 拉当前 user（含 teams[]）。
 * token 失效（401）等一律安全降级为未登录（清 token）。
 * 幂等，多次调用安全。总会把 ready 置 true。
 */
export async function restore() {
  try {
    if (!getToken()) {
      currentUser.value = null
      return null
    }
    const { user } = await apiMe()
    currentUser.value = user
    return user
  } catch {
    // token 失效或网络问题：降级未登录，清掉坏 token 免反复失败。
    logout()
    return null
  } finally {
    ready.value = true
  }
}
