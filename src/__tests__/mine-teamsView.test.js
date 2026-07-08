import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'

// 路由：TeamsView 用 useRouter().push 进队。
const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))

// auth.js：mock 队伍编排 + currentUser。
vi.mock('@/modules/practice/mine/auth.js', () => {
  const { ref } = require('vue')
  return {
    currentUser: ref({ id: 1, username: 'alice', displayName: '小A', teams: [] }),
    loadMyTeams: vi.fn(),
    createTeam: vi.fn(),
    joinTeam: vi.fn(),
  }
})

// dossier.js：迁移探测（本测试均无旧档案）。
vi.mock('@/modules/practice/mine/dossier.js', () => ({
  hasPendingMigration: () => false,
  migrateLegacyDossiers: vi.fn(),
  readLegacyDossiers: () => [],
}))

import TeamsView from '@/modules/practice/mine/TeamsView.vue'
import * as auth from '@/modules/practice/mine/auth.js'

// AuthGate 直接透传插槽（跳过登录门禁）；AppToast 空实现。
const stubs = {
  AuthGate: { template: '<div><slot /></div>' },
  AppToast: { template: '<div />', methods: { show() {} } },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TeamsView 队伍中枢', () => {
  it('空态：无队时引导建队', async () => {
    auth.loadMyTeams.mockResolvedValue([])
    const w = mount(TeamsView, { global: { stubs } })
    await flushPromises()
    expect(w.text()).toContain('创建你的第一个实践队')
    w.unmount()
  })

  it('渲染队卡片（队名/角色/成员数/我的档案数）', async () => {
    auth.loadMyTeams.mockResolvedValue([
      { id: 2, name: '甲队', role: 'owner', memberCount: 3, myDossierCount: 2 },
      { id: 5, name: '乙队', role: 'member', memberCount: 8, myDossierCount: 0 },
    ])
    const w = mount(TeamsView, { global: { stubs } })
    await flushPromises()
    const cards = w.findAll('.team-card')
    expect(cards).toHaveLength(2)
    expect(cards[0].text()).toContain('甲队')
    expect(cards[0].text()).toContain('建队人')
    expect(cards[0].text()).toContain('3 名队员')
    expect(cards[1].text()).toContain('队员')
    w.unmount()
  })

  it('点队卡片进入该队工作台', async () => {
    auth.loadMyTeams.mockResolvedValue([{ id: 2, name: '甲队', role: 'owner', memberCount: 1, myDossierCount: 0 }])
    const w = mount(TeamsView, { global: { stubs } })
    await flushPromises()
    await w.find('.team-card').trigger('click')
    expect(push).toHaveBeenCalledWith('/practice/mine/team/2')
    w.unmount()
  })

  it('建队成功后展示邀请码', async () => {
    auth.loadMyTeams.mockResolvedValue([])
    auth.createTeam.mockResolvedValue({ id: 9, name: '新队', inviteCode: 'K7P2M9QX', role: 'owner' })
    const w = mount(TeamsView, { global: { stubs } })
    await flushPromises()

    // 打开建队弹层
    await w.findAll('.btn.primary').find((b) => b.text().includes('建队')).trigger('click')
    await w.find('.modal input').setValue('新队')
    await w.find('.modal-form').trigger('submit')
    await flushPromises()

    expect(auth.createTeam).toHaveBeenCalledWith('新队')
    expect(w.find('.invite-code').text()).toBe('K7P2M9QX')
    w.unmount()
  })
})
