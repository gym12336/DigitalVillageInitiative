// 乡村百科 Service 层：分页列表 + 搜索筛选 + 单村详情 + 标签聚合。
// 标量列直接查；JSON 列以 TEXT 存储，读取时解析返回。
// SQLite 不支持 JSONB 索引，几百条数据全表扫描完全够用。

/** 将数据库行转为前端期望的 JSON 对象 */
function rowToVillage(row) {
  if (!row) return null
  return {
    id: row.id,
    name: row.name,
    fullName: row.full_name,
    province: row.province,
    city: row.city,
    district: row.district,
    town: row.town,
    summary: row.summary,
    intro: row.intro,
    cover: row.cover,
    certLevel: row.cert_level,
    certLabel: row.cert_label,
    coord: [row.coord_lng, row.coord_lat],
    views: row.views,
    favorites: row.favorites,
    practices: row.practices,
    honors: safeJson(row.honors, []),
    tags: safeJson(row.tags, {}),
    gallery: safeJson(row.gallery, []),
    guide: safeJson(row.guide, []),
    socials: safeJson(row.socials, {}),
    manager: safeJson(row.manager, {}),
    facts: safeJson(row.facts, {}),
    timeline: safeJson(row.timeline, []),
    specialties: safeJson(row.specialties, []),
    festivals: safeJson(row.festivals, []),
    sections: safeJson(row.sections, {}),
  }
}

function safeJson(raw, fallback) {
  if (!raw) return fallback
  try { return JSON.parse(raw) } catch { return fallback }
}

/** 分页列表 + 搜索 + 筛选。无鉴权，任何人可查。 */
export function list(db, { page = 1, pageSize = 20, q = '', province = '', tag = '' } = {}) {
  page = Math.max(1, Number(page))
  pageSize = Math.min(1000, Math.max(1, Number(pageSize)))
  const conditions = []
  const params = {}

  if (q) {
    conditions.push('(name LIKE @q OR full_name LIKE @q OR summary LIKE @q)')
    params.q = `%${q}%`
  }
  if (province) {
    conditions.push('province = @province')
    params.province = province
  }
  if (tag) {
    // 标签存在任意 JSON 值中
    conditions.push('tags LIKE @tag')
    params.tag = `%${tag}%`
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const offset = (page - 1) * pageSize

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM villages ${where}`).get(params).cnt
  const rows = db
    .prepare(`SELECT * FROM villages ${where} ORDER BY name LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: pageSize, offset })

  return {
    villages: rows.map(rowToVillage),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** 查询单个村庄详情 */
export function getById(db, id) {
  const row = db.prepare('SELECT * FROM villages WHERE id = ?').get(id)
  return rowToVillage(row)
}

/** 标签聚合 —— 获取所有省份列表 + 热门标签 */
export function getMeta(db) {
  const provinces = db
    .prepare('SELECT DISTINCT province FROM villages ORDER BY province')
    .all()
    .map((r) => r.province)

  // 热门标签：从所有村的 tags JSON 中提取出现频率最高的 20 个
  const allRows = db.prepare('SELECT tags FROM villages').all()
  const tagCount = {}
  for (const row of allRows) {
    const tags = safeJson(row.tags, {})
    for (const cat of Object.values(tags)) {
      if (Array.isArray(cat)) {
        for (const t of cat) {
          tagCount[t] = (tagCount[t] || 0) + 1
        }
      }
    }
  }
  const topTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([name, count]) => ({ name, count }))

  return { provinces, topTags }
}

/** 创建村庄（管理员用）。body 来自前端请求。 */
export function create(db, body) {
  const now = new Date().toISOString()
  const insert = db.prepare(`
    INSERT INTO villages (
      id, name, full_name, province, city, district, town,
      summary, intro, cover, cert_level, cert_label, coord_lat, coord_lng,
      views, favorites, practices,
      honors, tags, gallery, guide, socials, manager,
      facts, timeline, specialties, festivals, sections,
      created_at, updated_at
    ) VALUES (
      @id, @name, @fullName, @province, @city, @district, @town,
      @summary, @intro, @cover, @certLevel, @certLabel, @coordLat, @coordLng,
      @views, @favorites, @practices,
      @honors, @tags, @gallery, @guide, @socials, @manager,
      @facts, @timeline, @specialties, @festivals, @sections,
      @now, @now
    )
  `)
  insert.run(packParams(body, now))
  return getById(db, body.id)
}

/** 更新村庄 */
export function update(db, id, body) {
  const now = new Date().toISOString()
  const update = db.prepare(`
    UPDATE villages SET
      name = @name, full_name = @fullName, province = @province, city = @city,
      district = @district, town = @town,
      summary = @summary, intro = @intro, cover = @cover,
      cert_level = @certLevel, cert_label = @certLabel,
      coord_lat = @coordLat, coord_lng = @coordLng,
      views = @views, favorites = @favorites, practices = @practices,
      honors = @honors, tags = @tags, gallery = @gallery, guide = @guide,
      socials = @socials, manager = @manager,
      facts = @facts, timeline = @timeline, specialties = @specialties,
      festivals = @festivals, sections = @sections,
      updated_at = @now
    WHERE id = @id
  `)
  update.run(packParams({ ...body, id }, now))
  return getById(db, id)
}

/** 删除村庄 */
export function remove(db, id) {
  const result = db.prepare('DELETE FROM villages WHERE id = ?').run(id)
  return result.changes > 0
}

/** 批量导入村庄：事务内 INSERT OR IGNORE，返回 { inserted, skipped } */
export function createBatch(db, villages) {
  const now = new Date().toISOString()
  let inserted = 0
  let skipped = 0

  const insert = db.prepare(`
    INSERT OR IGNORE INTO villages (
      id, name, full_name, province, city, district, town,
      summary, intro, cover, cert_level, cert_label, coord_lat, coord_lng,
      views, favorites, practices,
      honors, tags, gallery, guide, socials, manager,
      facts, timeline, specialties, festivals, sections,
      created_at, updated_at
    ) VALUES (
      @id, @name, @fullName, @province, @city, @district, @town,
      @summary, @intro, @cover, @certLevel, @certLabel, @coordLat, @coordLng,
      @views, @favorites, @practices,
      @honors, @tags, @gallery, @guide, @socials, @manager,
      @facts, @timeline, @specialties, @festivals, @sections,
      @now, @now
    )
  `)

  const batch = db.transaction(() => {
    for (const v of villages) {
      const result = insert.run(packParams(v, now))
      result.changes ? inserted++ : skipped++
    }
  })
  batch()
  return { inserted, skipped }
}

/** 将前端 JSON 对象打包为 SQL 命名参数 */
function packParams(body, now) {
  return {
    id: body.id,
    name: body.name,
    fullName: body.fullName || '',
    province: body.province || '',
    city: body.city || '',
    district: body.district || '',
    town: body.town || '',
    summary: body.summary || '',
    intro: body.intro || '',
    cover: body.cover || '',
    certLevel: body.certLevel || 'township',
    certLabel: body.certLabel || '',
    coordLat: body.coord ? body.coord[1] : 0,
    coordLng: body.coord ? body.coord[0] : 0,
    views: body.views || 0,
    favorites: body.favorites || 0,
    practices: body.practices || 0,
    honors: jsonStr(body.honors, '[]'),
    tags: jsonStr(body.tags, '{}'),
    gallery: jsonStr(body.gallery, '[]'),
    guide: jsonStr(body.guide, '[]'),
    socials: jsonStr(body.socials, '{}'),
    manager: jsonStr(body.manager, '{}'),
    facts: jsonStr(body.facts, '{}'),
    timeline: jsonStr(body.timeline, '[]'),
    specialties: jsonStr(body.specialties, '[]'),
    festivals: jsonStr(body.festivals, '[]'),
    sections: jsonStr(body.sections, '{}'),
    now,
  }
}

function jsonStr(v, fallback) {
  return v ? JSON.stringify(v) : fallback
}
