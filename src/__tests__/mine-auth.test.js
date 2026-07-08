import { describe, it, expect, beforeEach, vi } from 'vitest'

// mock api.js，验证 auth.js 的登录态编排（存 token、置 user、恢复、降级）+ 队伍编排。
vi.mock('@/modules/practice/mine/api.js', () => ({
  getToken: vi.fn(),
  setToken: vi.fn(),
  apiRegister: vi.fn(),
  apiLogin: vi.fn(),
  apiMe: vi.fn(),
  apiListTeams: vi.fn(),
  apiCreateTeam: vi.fn(),
  apiJoinTeam: vi.fn(),
}))

import {
  currentUser,
  ready,
  isAuthed,
  myTeams,
  hasAnyTeam,
  login,
  logout,
  restore,
  loadMyTeams,
  createTeam,
  joinTeam,
} from '@/modules/practice/mine/auth.js'
import * as api from '@/modules/practice/mine/api.js'

beforeEach(() => {
  vi.clearAllMocks()
  logout() // 复位单例状态
  ready.value = false
})

describe('auth.js 登录态', () => {
  it('login 落地 token 与 user，isAuthed/hasAnyTeam 反映状态', async () => {
    api.apiLogin.mockResolvedValue({
      token: 'tok',
      user: { id: 1, username: 'a', displayName: '', teams: [{ id: 2, name: '第二队', role: 'member' }] },
    })
    await login({ username: 'a', password: 'b' })
    expect(api.setToken).toHaveBeenCalledWith('tok')
    expect(currentUser.value.username).toBe('a')
    expect(isAuthed.value).toBe(true)
    expect(hasAnyTeam.value).toBe(true)
    expect(myTeams.value).toHaveLength(1)
  })

  it('未加入任何队 hasAnyTeam 为 false', async () => {
    api.apiLogin.mockResolvedValue({ token: 't', user: { id: 1, username: 'a', teams: [] } })
    await login({ username: 'a', password: 'b' })
    expect(isAuthed.value).toBe(true)
    expect(hasAnyTeam.value).toBe(false)
  })

  it('logout 清 token 与 user', async () => {
    api.apiLogin.mockResolvedValue({ token: 't', user: { id: 1, username: 'a', teams: [] } })
    await login({ username: 'a', password: 'b' })
    logout()
    expect(api.setToken).toHaveBeenLastCalledWith('')
    expect(currentUser.value).toBe(null)
    expect(isAuthed.value).toBe(false)
  })

  it('restore 有 token 时调 /me 恢复 user（含 teams），置 ready', async () => {
    api.getToken.mockReturnValue('tok')
    api.apiMe.mockResolvedValue({
      user: { id: 5, username: 'z', teams: [{ id: 1, name: '第一队', role: 'owner' }] },
    })
    await restore()
    expect(currentUser.value.id).toBe(5)
    expect(myTeams.value[0].role).toBe('owner')
    expect(ready.value).toBe(true)
  })

  it('restore 无 token 时不请求，user 为 null 且 ready 为 true', async () => {
    api.getToken.mockReturnValue('')
    await restore()
    expect(api.apiMe).not.toHaveBeenCalled()
    expect(currentUser.value).toBe(null)
    expect(ready.value).toBe(true)
  })

  it('restore 时 token 失效（/me 抛错）→ 安全降级为未登录并清 token', async () => {
    api.getToken.mockReturnValue('bad')
    const err = new Error('登录已失效')
    err.status = 401
    api.apiMe.mockRejectedValue(err)
    await restore()
    expect(currentUser.value).toBe(null)
    expect(api.setToken).toHaveBeenCalledWith('') // 清坏 token
    expect(ready.value).toBe(true)
  })
})

describe('auth.js 队伍编排', () => {
  beforeEach(async () => {
    api.apiLogin.mockResolvedValue({ token: 't', user: { id: 1, username: 'a', teams: [] } })
    await login({ username: 'a', password: 'b' })
  })

  it('loadMyTeams 刷新 currentUser.teams（归一化为 id/name/role）', async () => {
    api.apiListTeams.mockResolvedValue([
      { id: 2, name: '甲队', role: 'owner', memberCount: 3, myDossierCount: 1 },
    ])
    const teams = await loadMyTeams()
    expect(teams).toHaveLength(1)
    expect(myTeams.value).toEqual([{ id: 2, name: '甲队', role: 'owner' }])
  })

  it('createTeam 建队后刷新我的队，返回含 inviteCode 的新队', async () => {
    api.apiCreateTeam.mockResolvedValue({ id: 9, name: '新队', inviteCode: 'ABC123', role: 'owner' })
    api.apiListTeams.mockResolvedValue([{ id: 9, name: '新队', role: 'owner' }])
    const team = await createTeam('新队')
    expect(team.inviteCode).toBe('ABC123')
    expect(api.apiListTeams).toHaveBeenCalled()
    expect(myTeams.value.some((t) => t.id === 9)).toBe(true)
  })

  it('joinTeam 加入后刷新我的队', async () => {
    api.apiJoinTeam.mockResolvedValue({ id: 3, name: '丙队', role: 'member' })
    api.apiListTeams.mockResolvedValue([{ id: 3, name: '丙队', role: 'member' }])
    const team = await joinTeam('CODE')
    expect(team.id).toBe(3)
    expect(myTeams.value[0].id).toBe(3)
  })
})
