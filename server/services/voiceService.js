// 乡村之声 Service 层:需求分页列表 + 搜索筛选排序 + 详情 + 计数 + 问答列表。
// 标量列直接查;majors/answers 以 JSON 文本存储,读取时解析。列 descr 对外映射回 desc。
// SQLite 全表扫描,几十条数据完全够用。无鉴权,任何人可读。

function safeJson(raw, fallback) {
  if (!raw) return fallback
  try {
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

/** 数据库行 → 前端需求对象(descr → desc,majors 解析)。 */
function rowToDemand(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    town: row.town,
    village: row.village,
    type: row.type,
    certBy: row.cert_by,
    publishTime: row.publish_time,
    status: row.status,
    deadline: row.deadline,
    views: row.views,
    favorites: row.favorites,
    majors: safeJson(row.majors, []),
    desc: row.descr,
    expected: row.expected,
    contact: row.contact,
    phone: row.phone,
  }
}

/** 数据库行 → 前端问答对象(answers 解析)。 */
function rowToQa(row) {
  if (!row) return null
  return {
    id: row.id,
    question: row.question,
    asker: row.asker,
    askTime: row.ask_time,
    answers: safeJson(row.answers, []),
  }
}

const SORT_SQL = {
  latest: 'publish_time DESC',
  views: 'views DESC',
  favorites: 'favorites DESC',
  deadline: 'deadline ASC',
}

/** 需求分页列表 + 搜索 + 筛选 + 排序。无鉴权。 */
export function list(db, { page = 1, pageSize = 20, q = '', type = '', status = '', sort = 'latest' } = {}) {
  page = Math.max(1, Number(page))
  pageSize = Math.min(1000, Math.max(1, Number(pageSize)))
  const conditions = []
  const params = {}

  if (q) {
    conditions.push('(title LIKE @q OR village LIKE @q OR town LIKE @q OR descr LIKE @q)')
    params.q = `%${q}%`
  }
  if (type) {
    conditions.push('type = @type')
    params.type = type
  }
  if (status) {
    conditions.push('status = @status')
    params.status = status
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''
  const orderBy = SORT_SQL[sort] || SORT_SQL.latest
  const offset = (page - 1) * pageSize

  const total = db.prepare(`SELECT COUNT(*) as cnt FROM demands ${where}`).get(params).cnt
  const rows = db
    .prepare(`SELECT * FROM demands ${where} ORDER BY ${orderBy} LIMIT @limit OFFSET @offset`)
    .all({ ...params, limit: pageSize, offset })

  return {
    demands: rows.map(rowToDemand),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  }
}

/** 单条需求详情。不存在返回 null。 */
export function getById(db, id) {
  const row = db.prepare('SELECT * FROM demands WHERE id = ?').get(id)
  return rowToDemand(row)
}

/** 浏览数 +1。返回新的需求对象;不存在返回 null。 */
export function incrementViews(db, id) {
  const r = db.prepare('UPDATE demands SET views = views + 1 WHERE id = ?').run(id)
  if (r.changes === 0) return null
  return getById(db, id)
}

/** 收藏计数增减(delta 归一为 +1/-1,favorites 不低于 0)。返回新对象;不存在 null。 */
export function adjustFavorites(db, id, delta) {
  const step = Number(delta) >= 0 ? 1 : -1
  const r = db
    .prepare('UPDATE demands SET favorites = MAX(0, favorites + @step) WHERE id = @id')
    .run({ step, id })
  if (r.changes === 0) return null
  return getById(db, id)
}

/** 全部问答(answers 已反序列化)。 */
export function listQa(db) {
  const rows = db.prepare('SELECT * FROM qa ORDER BY ask_time DESC').all()
  return rows.map(rowToQa)
}
