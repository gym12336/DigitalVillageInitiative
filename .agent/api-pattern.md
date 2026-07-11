# 后端 API 开发模式

> Express 5 后端开发的标准分层和代码模板。

---

## 分层架构

```
server/
├── routes/<domain>.js       → 路由层：参数提取 + 响应
├── services/<domain>Service.js → 服务层：业务逻辑
├── middleware/auth.js       → 认证中间件
├── middleware/errorHandler.js → 统一错误处理
├── db/connection.js         → 数据库单例
├── db/migrate.js            → 迁移脚本
└── lib/                     → 纯工具函数
```

## 路由层模板

```js
// server/routes/<resource>.js
import { Router } from 'express'
import { makeXxxService } from '../services/xxxService.js'
import { requireAuth } from '../middleware/auth.js'
import { HttpError } from '../middleware/errorHandler.js'

/**
 * @param {import('better-sqlite3').Database} db
 * @param {string} secret - JWT 密钥
 * @returns {Router}
 */
export function makeXxxRouter(db, secret) {
  const router = Router()
  const service = makeXxxService(db)

  // 列表查询
  router.get('/', requireAuth(secret), (req, res, next) => {
    try {
      const items = service.list(req.user.id)
      res.json({ data: items })
    } catch (err) {
      next(err)
    }
  })

  // 创建
  router.post('/', requireAuth(secret), (req, res, next) => {
    try {
      const { name, desc } = req.body
      if (!name) throw new HttpError(400, '缺少必填字段 name')
      const item = service.create({ userId: req.user.id, name, desc })
      res.status(201).json({ data: item })
    } catch (err) {
      next(err)
    }
  })

  // 单条查询
  router.get('/:id', requireAuth(secret), (req, res, next) => {
    try {
      const item = service.getById(req.params.id)
      if (!item) throw new HttpError(404, '资源不存在')
      res.json({ data: item })
    } catch (err) {
      next(err)
    }
  })

  // 更新
  router.put('/:id', requireAuth(secret), (req, res, next) => {
    try {
      const item = service.update(req.params.id, req.body)
      res.json({ data: item })
    } catch (err) {
      next(err)
    }
  })

  // 删除
  router.delete('/:id', requireAuth(secret), (req, res, next) => {
    try {
      service.remove(req.params.id)
      res.json({ ok: true })
    } catch (err) {
      next(err)
    }
  })

  return router
}
```

## 服务层模板

```js
// server/services/xxxService.js
/**
 * @param {import('better-sqlite3').Database} db
 */
export function makeXxxService(db) {
  return {
    list(userId) {
      return db.prepare(
        'SELECT * FROM xxx WHERE user_id = ? ORDER BY created_at DESC'
      ).all(userId)
    },

    getById(id) {
      return db.prepare('SELECT * FROM xxx WHERE id = ?').get(id)
    },

    create({ userId, name, desc }) {
      const id = genId()
      db.prepare(
        'INSERT INTO xxx (id, user_id, name, desc) VALUES (?, ?, ?, ?)'
      ).run(id, userId, name, desc)
      return this.getById(id)
    },

    update(id, fields) {
      // 白名单 + 动态 SQL
      const allowed = ['name', 'desc', 'status']
      const sets = []
      const vals = []
      for (const k of allowed) {
        if (fields[k] !== undefined) {
          sets.push(`${k} = ?`)
          vals.push(fields[k])
        }
      }
      if (sets.length === 0) return this.getById(id)
      vals.push(id)
      db.prepare(`UPDATE xxx SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
      return this.getById(id)
    },

    remove(id) {
      db.prepare('DELETE FROM xxx WHERE id = ?').run(id)
    },
  }
}
```

## 中间件

### 认证中间件

```js
// server/middleware/auth.js
import { verifyToken } from '../lib/token.js'
import { HttpError } from './errorHandler.js'

export function requireAuth(secret) {
  return (req, _res, next) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return next(new HttpError(401, '缺少认证令牌'))
    }
    try {
      req.user = verifyToken(header.slice(7), secret)
      next()
    } catch {
      next(new HttpError(401, '令牌无效或已过期'))
    }
  }
}
```

### 错误处理中间件

```js
// server/middleware/errorHandler.js
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function notFound(_req, _res, next) {
  next(new HttpError(404, '接口不存在'))
}

export function errorHandler(err, _req, res, _next) {
  const status = err.status || 500
  const message = err.message || '服务内部错误'
  if (status === 500) console.error(err)
  res.status(status).json({ error: message })
}
```

## API 响应格式

所有接口统一返回：

```json
// 成功
{ "data": { ... }, "ok": true }
{ "data": [ ... ] }

// 错误
{ "error": "错误描述" }

// 分页（未来扩展）
{ "data": [ ... ], "total": 100, "page": 1, "pageSize": 20 }
```

## 数据库迁移

所有建表语句集中在 `server/db/migrate.js`，使用 `CREATE TABLE IF NOT EXISTS`，幂等执行。

```js
// server/db/migrate.js
export function migrate(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS dossiers (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      stage TEXT DEFAULT 'planning',
      data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `)
  // ... 更多表
}
```

## 关键原则

1. **路由只做参数提取和响应**，不写业务逻辑。
2. **服务层不碰 req/res**，纯数据 in / 纯数据 out。
3. **错误走 next(err)**，不 try-catch 后直接 res.json。
4. **SQL 参数化**——永远不要拼接 SQL 字符串。
5. **白名单更新**——动态字段必须过滤允许的 key。
