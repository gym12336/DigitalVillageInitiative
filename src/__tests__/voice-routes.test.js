import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import Database from 'better-sqlite3'
import { migrate } from '../../server/db/migrate.js'
import { seedVoice } from '../../server/db/seed-voice.js'
import { createApp } from '../../server/app.js'

const SECRET = 'test-secret'
const NOW = '2026-07-09T00:00:00.000Z'
let app
let db

beforeEach(() => {
  db = new Database(':memory:')
  migrate(db, NOW)
  seedVoice(db, NOW)
  app = createApp({ db, secret: SECRET })
})

describe('乡村之声 /api/voice', () => {
  it('GET /api/voice 返回需求列表 + 分页字段', async () => {
    const res = await request(app).get('/api/voice')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(8) // voice-data.json 有 8 条需求
    expect(res.body.demands.length).toBe(8)
    // majors 已反序列化为数组,desc 字段存在(由 descr 映射回)
    const first = res.body.demands[0]
    expect(Array.isArray(first.majors)).toBe(true)
    expect(typeof first.desc).toBe('string')
  })

  it('GET /api/voice?type= 按类型筛选', async () => {
    const res = await request(app).get('/api/voice?type=产业帮扶')
    expect(res.status).toBe(200)
    expect(res.body.demands.every((d) => d.type === '产业帮扶')).toBe(true)
    expect(res.body.total).toBeGreaterThan(0)
  })

  it('GET /api/voice?status= 按状态筛选', async () => {
    const res = await request(app).get('/api/voice?status=已完成')
    expect(res.status).toBe(200)
    expect(res.body.demands.every((d) => d.status === '已完成')).toBe(true)
  })

  it('GET /api/voice?q= 关键词命中标题/村/描述', async () => {
    const res = await request(app).get('/api/voice?q=竹编')
    expect(res.status).toBe(200)
    expect(res.body.total).toBeGreaterThan(0)
    expect(res.body.demands.some((d) => d.title.includes('竹编'))).toBe(true)
  })

  it('GET /api/voice?sort=views 按浏览量降序', async () => {
    const res = await request(app).get('/api/voice?sort=views')
    const views = res.body.demands.map((d) => d.views)
    const sorted = [...views].sort((a, b) => b - a)
    expect(views).toEqual(sorted)
  })

  it('GET /api/voice/:id 命中返回详情', async () => {
    const res = await request(app).get('/api/voice/v1')
    expect(res.status).toBe(200)
    expect(res.body.demand.id).toBe('v1')
    expect(res.body.demand.contact).toBeTruthy()
  })

  it('GET /api/voice/:id 不存在返回 404', async () => {
    const res = await request(app).get('/api/voice/nope')
    expect(res.status).toBe(404)
  })

  it('POST /api/voice/:id/view 浏览数 +1', async () => {
    const before = (await request(app).get('/api/voice/v1')).body.demand.views
    const res = await request(app).post('/api/voice/v1/view')
    expect(res.status).toBe(200)
    expect(res.body.demand.views).toBe(before + 1)
  })

  it('POST /api/voice/:id/favorite 收藏增减', async () => {
    const before = (await request(app).get('/api/voice/v1')).body.demand.favorites
    const up = await request(app).post('/api/voice/v1/favorite').send({ delta: 1 })
    expect(up.body.demand.favorites).toBe(before + 1)
    const down = await request(app).post('/api/voice/v1/favorite').send({ delta: -1 })
    expect(down.body.demand.favorites).toBe(before)
  })

  it('POST /api/voice/:id/view 不存在返回 404', async () => {
    const res = await request(app).post('/api/voice/nope/view')
    expect(res.status).toBe(404)
  })

  it('GET /api/voice/qa 返回问答,answers 已反序列化', async () => {
    const res = await request(app).get('/api/voice/qa')
    expect(res.status).toBe(200)
    expect(res.body.qa.length).toBe(4) // voice-data.json 有 4 条问答
    expect(Array.isArray(res.body.qa[0].answers)).toBe(true)
  })

  it('seedVoice 幂等:重复灌入行数不变', () => {
    const c1 = db.prepare('SELECT COUNT(*) as n FROM demands').get().n
    seedVoice(db, NOW)
    const c2 = db.prepare('SELECT COUNT(*) as n FROM demands').get().n
    expect(c2).toBe(c1)
  })
})
