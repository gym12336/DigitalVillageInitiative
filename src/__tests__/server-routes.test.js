import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'
import { migrate } from '../../server/db/migrate.js'
import { createApp } from '../../server/app.js'

const SECRET = 'test-secret'
let app

beforeEach(() => {
  const db = new Database(':memory:')
  migrate(db, '2026-07-08T00:00:00.000Z')
  app = createApp({ db, secret: SECRET })
})

async function register(username) {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username, password: 'secret1', displayName: username })
  return reg.body.token
}
const auth = (token) => ({ Authorization: `Bearer ${token}` })

async function createTeam(token, name) {
  const res = await request(app).post('/api/teams').set(auth(token)).send({ name })
  return res.body.team // { id, inviteCode, role, ... }
}

describe('server routes (HTTP 冒烟)', () => {
  it('闭环：注册→建队→拿码→他人加入→双方在队员列表→各自建档→跨队被拒', async () => {
    const alice = await register('alice')
    const team = await createTeam(alice, '桃源队')
    expect(team.role).toBe('owner')
    expect(team.inviteCode).toBeTruthy()

    // bob 用邀请码加入
    const bob = await register('bob')
    const joined = await request(app).post('/api/teams/join').set(auth(bob)).send({ inviteCode: team.inviteCode })
    expect(joined.status).toBe(200)
    expect(joined.body.team.id).toBe(team.id)

    // 双方都在队员列表
    const members = await request(app).get(`/api/teams/${team.id}/members`).set(auth(alice))
    expect(members.status).toBe(200)
    const names = members.body.members.map((m) => m.username).sort()
    expect(names).toEqual(['alice', 'bob'])

    // 各自在该队建档
    const d1 = await request(app).post('/api/dossiers').set(auth(alice)).send({ teamId: team.id, id: 'da', title: 'A的实践', plan: { goal: 'g' } })
    expect(d1.status).toBe(201)
    const d2 = await request(app).post('/api/dossiers').set(auth(bob)).send({ teamId: team.id, id: 'db', title: 'B的实践' })
    expect(d2.status).toBe(201)

    // 列表带 teamId，返回该队 2 份
    const list = await request(app).get(`/api/dossiers?teamId=${team.id}`).set(auth(alice))
    expect(list.body.dossiers).toHaveLength(2)

    // 队员列表档案计数正确
    const m2 = await request(app).get(`/api/teams/${team.id}/members`).set(auth(bob))
    const byName = Object.fromEntries(m2.body.members.map((m) => [m.username, m]))
    expect(byName.alice.dossierCount).toBe(1)
    expect(byName.bob.dossierCount).toBe(1)

    // 跨队：carol 建自己的队，读 alice 的档案 → 403
    const carol = await register('carol')
    await createTeam(carol, '另一队')
    const cross = await request(app).get('/api/dossiers/da').set(auth(carol))
    expect(cross.status).toBe(403)
    // 非成员看队员列表 → 403
    const crossMembers = await request(app).get(`/api/teams/${team.id}/members`).set(auth(carol))
    expect(crossMembers.status).toBe(403)
  })

  it('/me 返回 teams[]（含 role）', async () => {
    const alice = await register('alice')
    const team = await createTeam(alice, '桃源队')
    const me = await request(app).get('/api/auth/me').set(auth(alice))
    expect(me.body.user.teams).toEqual([{ id: team.id, name: '桃源队', role: 'owner' }])
  })

  it('重复加入幂等（200，不重复行）', async () => {
    const alice = await register('alice')
    const team = await createTeam(alice, '队')
    const bob = await register('bob')
    await request(app).post('/api/teams/join').set(auth(bob)).send({ inviteCode: team.inviteCode })
    const again = await request(app).post('/api/teams/join').set(auth(bob)).send({ inviteCode: team.inviteCode })
    expect(again.status).toBe(200)
    const members = await request(app).get(`/api/teams/${team.id}/members`).set(auth(alice))
    expect(members.body.members).toHaveLength(2)
  })

  it('建队人退队 403', async () => {
    const alice = await register('alice')
    const team = await createTeam(alice, '队')
    const res = await request(app).delete(`/api/teams/${team.id}/leave`).set(auth(alice))
    expect(res.status).toBe(403)
  })

  it('无 token 访问档案接口 401', async () => {
    const res = await request(app).get('/api/dossiers?teamId=1')
    expect(res.status).toBe(401)
  })

  it('缺 teamId 建档 400', async () => {
    const alice = await register('alice')
    const res = await request(app).post('/api/dossiers').set(auth(alice)).send({ id: 'x', title: 'x' })
    expect(res.status).toBe(400)
  })

  it('无效邀请码加入 409', async () => {
    const alice = await register('alice')
    const res = await request(app).post('/api/teams/join').set(auth(alice)).send({ inviteCode: 'NOPE-XX' })
    expect(res.status).toBe(409)
  })

  it('import 迁移到指定队：重铸 id、返回计数', async () => {
    const alice = await register('alice')
    const team = await createTeam(alice, '队')
    const res = await request(app)
      .post('/api/dossiers/import')
      .set(auth(alice))
      .send({ teamId: team.id, dossiers: [{ id: 'old-1', title: 'A' }, { id: 'old-2', title: 'B' }] })
    expect(res.status).toBe(201)
    expect(res.body.imported).toBe(2)
    expect(res.body.ids.every((id) => id !== 'old-1' && id !== 'old-2')).toBe(true)
  })

  it('删除他人档案 403，本人可删', async () => {
    const alice = await register('alice')
    const team = await createTeam(alice, '队')
    await request(app).post('/api/dossiers').set(auth(alice)).send({ teamId: team.id, id: 'd1', title: 'A' })

    const bob = await register('bob')
    await request(app).post('/api/teams/join').set(auth(bob)).send({ inviteCode: team.inviteCode })
    const denied = await request(app).delete('/api/dossiers/d1').set(auth(bob))
    expect(denied.status).toBe(403)

    const ok = await request(app).delete('/api/dossiers/d1').set(auth(alice))
    expect(ok.status).toBe(200)
  })

  it('POST /api/plan/generate 未登录 → 401', async () => {
    const res = await request(app).post('/api/plan/generate').send({ idea: '去村里' })
    expect(res.status).toBe(401)
  })

  it('POST /api/plan/generate 缺 idea → 400', async () => {
    const alice = await register('alice')
    const res = await request(app).post('/api/plan/generate').set(auth(alice)).send({})
    expect(res.status).toBe(400)
  })

  it('POST /api/plan/generate 正常返回合法 plan（无 key 时是 template 版）', async () => {
    const alice = await register('alice')
    const res = await request(app)
      .post('/api/plan/generate')
      .set(auth(alice))
      .send({ idea: '去陈家铺村帮村民把竹编卖出去' })
    expect(res.status).toBe(200)
    const { plan } = res.body
    expect(plan).toBeTruthy()
    expect(plan.source).toBe('template') // 测试环境无 DEEPSEEK_API_KEY
    expect(plan.phases).toHaveLength(3)
    expect(plan.phases.map((p) => p.stage)).toEqual(['plan', 'track', 'result'])
    expect(plan.topic).toBeTruthy()
    expect(plan.generatedAt).toBeTruthy()
  })

  it('重复用户名注册 409', async () => {
    await request(app).post('/api/auth/register').send({ username: 'dup', password: 'secret1' })
    const res = await request(app).post('/api/auth/register').send({ username: 'dup', password: 'secret1' })
    expect(res.status).toBe(409)
  })
})

describe('/api/search/web', () => {
  it('未登录 → 401', async () => {
    const res = await request(app)
      .post('/api/search/web')
      .send({ village: '陈家铺村' })
    expect(res.status).toBe(401)
  })

  it('缺 village → 400', async () => {
    const token = await register('searchuser')
    const res = await request(app)
      .post('/api/search/web')
      .set(auth(token))
      .send({ idea: '帮村民' })
    expect(res.status).toBe(400)
  })

  it('正常请求（BING key 未配）→ 200 且 results 为空数组', async () => {
    const token = await register('searchuser2')
    const res = await request(app)
      .post('/api/search/web')
      .set(auth(token))
      .send({ village: '陈家铺村', idea: '帮村民卖竹编' })
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('results')
    expect(Array.isArray(res.body.results)).toBe(true)
    // 测试环境未配 BING key → results 为空
    expect(res.body.results).toEqual([])
  })
})
