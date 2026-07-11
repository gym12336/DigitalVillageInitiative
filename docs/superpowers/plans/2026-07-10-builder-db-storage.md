# 搭建台数据存储迁移至数据库 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将搭建台的 3 类 localStorage 数据迁移到 SQLite 数据库 `builder_documents` 表，关联到实践档案（dossier）。

**Architecture:** 新增 `builder_documents` 表（type 区分 editor/display/big-component），Express 路由 `/api/builder`，前端 `builderApi.js` 封装 API 调用。EditorCanvas 的 `saveKey` prop 改为 `documentType` + `dossierId`。无 dossierId 时通过 DossierPicker 选择档案。

**Tech Stack:** better-sqlite3 (同步), Express 5, Vue 3 Composition API, vue-router hash history

## Global Constraints

- JWT 认证：所有 `/api/builder` 路由需 `makeAuth` 中间件
- 授权：通过 dossier → team_id → `assertMember(userId, teamId)` 鉴权
- editor/display 类型每 dossier 各最多一条（upsert），big-component 可多条
- Dossier 删除时级联删除关联 builder_documents（ON DELETE CASCADE）
- 保存时机：手动点击保存按钮（与现有一致）
- 大组件模板按 dossier 隔离
- 前端 API client 从 `practice/mine/api.js` 复制 `request()` 和 `getToken()`（不提取公共模块）

---

### Task 1: 数据库 — 新增 builder_documents 表

**Files:**
- Modify: `server/db/schema.sql`

**Interfaces:**
- Produces: `builder_documents` 表 (id, dossier_id, created_by, type, name, payload, created_at, updated_at) + 索引

- [ ] **Step 1: 在 schema.sql 末尾追加建表 DDL**

在 `server/db/schema.sql` 末尾追加：

```sql
-- 搭建台成果文档（大组件编辑台画布 / 大屏展示工作台画布 / 大组件模板）。
-- type: 'editor' | 'display' | 'big-component'；editor 与 display 每 dossier 各最多一条（upsert）。
CREATE TABLE IF NOT EXISTS builder_documents (
  id          TEXT PRIMARY KEY,
  dossier_id  TEXT NOT NULL,
  created_by  INTEGER NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('editor', 'display', 'big-component')),
  name        TEXT,
  payload     TEXT NOT NULL,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  FOREIGN KEY (dossier_id) REFERENCES dossiers(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_builder_documents_dossier_type
  ON builder_documents(dossier_id, type);
```

- [ ] **Step 2: 验证迁移脚本执行**

重启后端（或启动时 migrate 自动执行 CREATE IF NOT EXISTS）：

```bash
cd server && node index.js
```

预期：无报错，`app.db` 中出现 `builder_documents` 表。

- [ ] **Step 3: Commit**

```bash
git add server/db/schema.sql
git commit -m "feat: add builder_documents table to schema"
```

---

### Task 2: 后端服务层 — builderService.js

**Files:**
- Create: `server/services/builderService.js`

**Interfaces:**
- Consumes: `server/lib/validate.js` (httpError), `server/services/teamService.js` (assertMember)
- Produces: `listByDossier(db, user, dossierId, type)`, `upsert(db, user, dossierId, { type, name, payload, id })`, `remove(db, user, documentId)`

- [ ] **Step 1: 创建 server/services/builderService.js**

```js
// 搭建台成果文档读写 + 权限判定。纯逻辑，db 显式传入。
// type: 'editor' | 'display' | 'big-component'
import { httpError } from '../lib/validate.js'
import { assertMember } from './teamService.js'

function dossierById(db, id) {
  return db.prepare('SELECT * FROM dossiers WHERE id = ?').get(id)
}

function docById(db, id) {
  return db.prepare('SELECT * FROM builder_documents WHERE id = ?').get(id)
}

function rowsByDossierAndType(db, dossierId, type) {
  return db
    .prepare('SELECT * FROM builder_documents WHERE dossier_id = ? AND type = ? ORDER BY created_at DESC')
    .all(dossierId, type)
}

/** 列出某 dossier 下指定类型的所有文档。鉴权后再查。 */
export function listByDossier(db, user, dossierId, type) {
  if (!['editor', 'display', 'big-component'].includes(type))
    throw httpError(400, 'type 须为 editor / display / big-component')
  const d = dossierById(db, dossierId)
  if (!d) throw httpError(404, '档案不存在')
  assertMember(db, user.id, d.team_id)
  return rowsByDossierAndType(db, dossierId, type)
}

/**
 * 创建或覆盖文档。
 * - editor / display：同 dossier 同 type 已存在 → 覆盖；不存在 → 创建
 * - big-component：始终创建新记录
 */
export function upsert(db, user, dossierId, { type, name, payload, id }, now = new Date().toISOString()) {
  if (!['editor', 'display', 'big-component'].includes(type))
    throw httpError(400, 'type 须为 editor / display / big-component')
  if (!payload || typeof payload !== 'string')
    throw httpError(400, 'payload 必须是字符串')

  const d = dossierById(db, dossierId)
  if (!d) throw httpError(404, '档案不存在')
  assertMember(db, user.id, d.team_id)

  if (type === 'editor' || type === 'display') {
    const existing = rowsByDossierAndType(db, dossierId, type)
    if (existing.length > 0) {
      // 覆盖
      db.prepare(
        'UPDATE builder_documents SET payload = ?, updated_at = ? WHERE dossier_id = ? AND type = ?',
      ).run(payload, now, dossierId, type)
      return rowsByDossierAndType(db, dossierId, type)[0]
    }
  }

  // 新建
  const docId = id || `bd_${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`
  const docName = type === 'big-component' ? (name || '') : null
  db.prepare(
    `INSERT INTO builder_documents (id, dossier_id, created_by, type, name, payload, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(docId, dossierId, user.id, type, docName, payload, now, now)
  return docById(db, docId)
}

/** 删除文档（仅 big-component）。返回 true。 */
export function remove(db, user, documentId) {
  const doc = docById(db, documentId)
  if (!doc) throw httpError(404, '文档不存在')
  if (doc.type !== 'big-component') throw httpError(400, '只能删除大组件类型文档')

  const d = dossierById(db, doc.dossier_id)
  if (!d) throw httpError(404, '关联档案不存在')
  assertMember(db, user.id, d.team_id)

  db.prepare('DELETE FROM builder_documents WHERE id = ?').run(documentId)
  return true
}
```

- [ ] **Step 2: Commit**

```bash
git add server/services/builderService.js
git commit -m "feat: add builderService — listByDossier, upsert, remove"
```

---

### Task 3: 后端路由 — builder.js + app.js 注册

**Files:**
- Create: `server/routes/builder.js`
- Modify: `server/app.js`

**Interfaces:**
- Consumes: `builderService.js` (listByDossier, upsert, remove), `middleware/auth.js` (makeAuth)
- Produces: `GET /api/builder/:dossierId/documents?type=`, `POST /api/builder/:dossierId/documents`, `DELETE /api/builder/documents/:id`

- [ ] **Step 1: 创建 server/routes/builder.js**

```js
// 搭建台成果文档路由。全部需登录。
import { Router } from 'express'
import * as svc from '../services/builderService.js'
import { makeAuth } from '../middleware/auth.js'

export function makeBuilderRouter(db, secret) {
  const router = Router()
  router.use(makeAuth(secret, db))

  // 列出某 dossier 下的文档。query: ?type=editor|display|big-component
  router.get('/:dossierId/documents', (req, res, next) => {
    try {
      const docs = svc.listByDossier(db, req.user, req.params.dossierId, req.query.type)
      res.json({ documents: docs })
    } catch (e) {
      next(e)
    }
  })

  // 创建或覆盖文档。body: { type, name?, payload, id? }
  router.post('/:dossierId/documents', (req, res, next) => {
    try {
      const doc = svc.upsert(db, req.user, req.params.dossierId, req.body)
      res.status(201).json({ document: doc })
    } catch (e) {
      next(e)
    }
  })

  // 删除文档（仅 big-component）
  router.delete('/documents/:id', (req, res, next) => {
    try {
      svc.remove(db, req.user, req.params.id)
      res.json({ ok: true })
    } catch (e) {
      next(e)
    }
  })

  return router
}
```

- [ ] **Step 2: 在 server/app.js 注册路由**

在 `server/app.js` 中，在 search 路由注册之后、`app.use('/api', notFound)` 之前添加：

```js
import { makeBuilderRouter } from './routes/builder.js'
// ... (在其他 import 之后)

// 在 createApp 函数内，app.use('/api/search', ...) 之后添加：
app.use('/api/builder', makeBuilderRouter(db, secret))
```

具体编辑：在 `app.use('/api/search', makeSearchRouter(db, secret))` 后插入一行。

- [ ] **Step 3: 验证路由注册**

启动后端并测试：

```bash
# 启动后端
cd server && node index.js

# 另一个终端测试（需要先登录获取 token）
curl -H "Authorization: Bearer <token>" "http://localhost:3001/api/builder/some-dossier-id/documents?type=editor"
```

预期：返回 `{"documents":[]}`（空数组，档案不存在则 404）。

- [ ] **Step 4: Commit**

```bash
git add server/routes/builder.js server/app.js
git commit -m "feat: add /api/builder routes with auth"
```

---

### Task 4: 前端 API 客户端 — builderApi.js

**Files:**
- Create: `src/modules/builder/builderApi.js`

**Interfaces:**
- Produces: `apiLoadDocuments(dossierId, type)`, `apiSaveDocument(dossierId, { type, name, payload, id })`, `apiDeleteDocument(id)`

- [ ] **Step 1: 创建 src/modules/builder/builderApi.js**

从 `src/modules/practice/mine/api.js` 复制 `TOKEN_KEY`、`getToken()`、`setToken()`、`apiError()`、`request()`、`safeParse()`，然后追加 builder 专用函数：

```js
// 搭建台 API 客户端。token 机制与 practice/mine/api.js 共享（同一 TOKEN_KEY）。
const TOKEN_KEY = 'sx.mine.token'

let memoryToken = ''

export function getToken() {
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      return localStorage.getItem(TOKEN_KEY) || ''
    }
  } catch { /* 隐私模式降级 */ }
  return memoryToken
}

export function setToken(token) {
  memoryToken = token || ''
  try {
    if (typeof localStorage !== 'undefined' && localStorage) {
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    }
  } catch { /* 降级到内存 */ }
}

function apiError(status, message) {
  const err = new Error(message || '请求失败')
  err.status = status
  return err
}

function safeParse(text) {
  try { return JSON.parse(text) } catch { return null }
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw apiError(0, '无法连接服务器，请检查网络或后端是否启动')
  }

  const text = await res.text()
  const data = text ? safeParse(text) : null

  if (!res.ok) {
    const message = (data && data.error) || `请求失败（${res.status}）`
    throw apiError(res.status, message)
  }
  return data
}

// —— 搭建台文档域 ——

/** 列出某 dossier 下指定类型的文档。 */
export async function apiLoadDocuments(dossierId, type) {
  const data = await request(
    `/api/builder/${encodeURIComponent(dossierId)}/documents?type=${encodeURIComponent(type)}`,
  )
  return (data && data.documents) || []
}

/** 创建或覆盖文档。返回落库的 document。 */
export async function apiSaveDocument(dossierId, { type, name, payload, id } = {}) {
  const data = await request(
    `/api/builder/${encodeURIComponent(dossierId)}/documents`,
    { method: 'POST', body: { type, name, payload, id } },
  )
  return data && data.document
}

/** 删除文档（仅 big-component）。 */
export function apiDeleteDocument(id) {
  return request(`/api/builder/documents/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/builderApi.js
git commit -m "feat: add builderApi client for /api/builder"
```

---

### Task 5: 路由 — 新增带 dossierId 的 builder 路由

**Files:**
- Modify: `src/modules/builder/routes.js`

**Interfaces:**
- Produces: `/builder/editor/:dossierId` → BigComponentEditor, `/builder/display/:dossierId` → DisplayWorkbench

- [ ] **Step 1: 添加带 dossierId 的别名路由**

修改 `src/modules/builder/routes.js`，在现有路由后追加两条：

```js
// src/modules/builder/routes.js
import BuilderHub from './BuilderHub.vue'
import BigComponentEditor from './editor/BigComponentEditor.vue'
import DisplayWorkbench from './display/DisplayWorkbench.vue'

export default [
  { path: '/builder', name: 'builder', component: BuilderHub },
  { path: '/builder/editor', name: 'builder-editor', component: BigComponentEditor },
  { path: '/builder/display', name: 'builder-display', component: DisplayWorkbench },
  // 带实践档案上下文的别名路由
  { path: '/builder/editor/:dossierId', name: 'builder-editor-dossier', component: BigComponentEditor },
  { path: '/builder/display/:dossierId', name: 'builder-display-dossier', component: DisplayWorkbench },
]
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/routes.js
git commit -m "feat: add dossierId param routes for builder editor/display"
```

---

### Task 6: DossierPicker 组件

**Files:**
- Create: `src/modules/builder/DossierPicker.vue`

**Interfaces:**
- Consumes: `vue-router` (useRouter, useRoute), `practice/mine/auth.js` (currentUser, isAuthed, myTeams), `practice/mine/api.js` (apiListDossiers)
- Produces: 组件 emits `update:dossierId`，通过 `router.replace` 同步 URL

- [ ] **Step 1: 创建 src/modules/builder/DossierPicker.vue**

```vue
<!-- src/modules/builder/DossierPicker.vue -->
<template>
  <div class="dp-root">
    <template v-if="!isAuthed">
      <span class="dp-label">⚠️ 请先登录「我的实践」</span>
    </template>
    <template v-else-if="selectedDossierId">
      <span class="dp-current">
        📋 {{ selectedTitle || selectedDossierId }}
      </span>
      <button class="dp-switch-btn" @click="showPicker = !showPicker">切换</button>
    </template>
    <template v-else>
      <span class="dp-placeholder">选择关联的实践档案</span>
      <button class="dp-pick-btn" @click="showPicker = !showPicker">选择</button>
    </template>

    <!-- 下拉选择器 -->
    <div v-if="showPicker" class="dp-dropdown">
      <div class="dp-dropdown-header">选择实践档案</div>
      <div v-if="loading" class="dp-loading">加载中...</div>
      <template v-else v-for="team in teamsWithDossiers" :key="team.id">
        <div class="dp-team-label">{{ team.name }}</div>
        <button
          v-for="d in team.dossiers"
          :key="d.id"
          class="dp-item"
          :class="{ active: d.id === selectedDossierId }"
          @click="select(d)"
        >
          {{ d.title || d.id }}
        </button>
      </template>
      <div v-if="allEmpty" class="dp-empty">暂无实践档案，请先创建</div>
    </div>

    <!-- 遮罩层 -->
    <div v-if="showPicker" class="dp-overlay" @click="showPicker = false"></div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { currentUser, isAuthed, myTeams } from '../practice/mine/auth.js'
import { apiListDossiers } from '../practice/mine/api.js'

const props = defineProps({
  dossierId: { type: String, default: '' },
})

const router = useRouter()
const route = useRoute()

const showPicker = ref(false)
const loading = ref(false)
const teamsWithDossiers = ref([])

const selectedDossierId = computed(() => props.dossierId)

const selectedTitle = computed(() => {
  if (!selectedDossierId.value) return ''
  for (const t of teamsWithDossiers.value) {
    const found = t.dossiers.find(d => d.id === selectedDossierId.value)
    if (found) return found.title
  }
  return ''
})

const allEmpty = computed(() =>
  teamsWithDossiers.value.every(t => t.dossiers.length === 0),
)

async function loadDossiers() {
  if (!isAuthed.value) return
  loading.value = true
  try {
    const teams = myTeams.value
    const result = []
    for (const t of teams) {
      try {
        const dossiers = await apiListDossiers(t.id)
        result.push({ id: t.id, name: t.name, dossiers })
      } catch { /* skip */ }
    }
    teamsWithDossiers.value = result
  } finally {
    loading.value = false
  }
}

function select(d) {
  showPicker.value = false
  const currentPath = route.path
  // 例如 /builder/editor → /builder/editor/d1a2b3
  // 或 /builder/editor/oldId → /builder/editor/d1a2b3
  const base = currentPath.replace(/\/[^/]+$/, '') // 去掉最后一段
  const newPath = `${base}/${d.id}`
  router.replace(newPath)
}

watch(isAuthed, (val) => {
  if (val) loadDossiers()
})

onMounted(() => {
  if (isAuthed.value) loadDossiers()
})
</script>

<style scoped>
.dp-root {
  display: flex; align-items: center; gap: 0.5rem;
  padding: 0.4rem 0.9rem;
  position: relative;
}
.dp-label, .dp-placeholder {
  font-size: 0.78rem; color: rgba(255,255,255,0.6);
}
.dp-current {
  font-size: 0.78rem; color: rgba(255,255,255,0.9); font-weight: 600;
}
.dp-switch-btn, .dp-pick-btn {
  padding: 0.25rem 0.6rem;
  border: 1px solid rgba(255,255,255,0.2);
  border-radius: 12px;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.8);
  font-size: 0.72rem; cursor: pointer;
  transition: all 0.15s;
}
.dp-switch-btn:hover, .dp-pick-btn:hover {
  background: rgba(255,255,255,0.14);
  border-color: rgba(255,255,255,0.35);
}
.dp-overlay {
  position: fixed; inset: 0; z-index: 998;
}
.dp-dropdown {
  position: absolute; top: 100%; left: 0;
  z-index: 999;
  min-width: 260px; max-height: 320px; overflow-y: auto;
  background: #1e2a3a;
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.4);
  margin-top: 6px;
}
.dp-dropdown-header {
  padding: 0.6rem 1rem;
  font-size: 0.72rem; color: rgba(255,255,255,0.5);
  text-transform: uppercase; letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.dp-loading, .dp-empty {
  padding: 1rem; text-align: center;
  font-size: 0.78rem; color: rgba(255,255,255,0.4);
}
.dp-team-label {
  padding: 0.4rem 1rem 0.2rem;
  font-size: 0.68rem; color: rgba(255,255,255,0.35);
  text-transform: uppercase; letter-spacing: 0.05em;
}
.dp-item {
  display: block; width: 100%;
  padding: 0.5rem 1rem;
  border: none; background: transparent;
  text-align: left;
  font-size: 0.82rem; color: rgba(255,255,255,0.8);
  cursor: pointer;
  transition: background 0.12s;
}
.dp-item:hover { background: rgba(255,255,255,0.06); }
.dp-item.active {
  background: rgba(44,125,160,0.2);
  color: #56ccf2;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/DossierPicker.vue
git commit -m "feat: add DossierPicker component for builder dossier context"
```

---

### Task 7: stageEditor.js — 新增 saveToDB / loadFromDB

**Files:**
- Modify: `src/modules/builder/editor/stageEditor.js`

**Interfaces:**
- Consumes: `builderApi.js` (apiLoadDocuments, apiSaveDocument)
- Produces: `saveToDB(dossierId, type)` (async), `loadFromDB(dossierId, type)` (async)
- Removes: 保留现有 `save()` / `load()` 函数（向后兼容），新增 async 版本

- [ ] **Step 1: 在 stageEditor.js 中追加 saveToDB 和 loadFromDB**

在 `src/modules/builder/editor/stageEditor.js` 文件末尾追加两个新函数：

```js
// —— Database persistence (replaces localStorage save/load) ——
import { apiLoadDocuments, apiSaveDocument } from '../builderApi.js'

/**
 * Save current canvas state to the database.
 * @param {string} dossierId
 * @param {'editor'|'display'} type
 */
export async function saveToDB(dossierId, type) {
  const payload = JSON.stringify({
    components: JSON.parse(JSON.stringify(state.components)),
    pageWidth: state.pageWidth,
    pageHeight: state.pageHeight,
    pageBackground: state.pageBackground,
    nextId: state.nextId,
  })
  await apiSaveDocument(dossierId, { type, payload })
}

/**
 * Load canvas state from the database. Resets clipboard/history like localStorage load().
 * @param {string} dossierId
 * @param {'editor'|'display'} type
 * @returns {Promise<boolean>} true if data was loaded, false if no data found
 */
export async function loadFromDB(dossierId, type) {
  try {
    const docs = await apiLoadDocuments(dossierId, type)
    if (!docs || docs.length === 0) return false
    const doc = docs[0]
    const data = JSON.parse(doc.payload)
    state.components = data.components || []
    state.pageWidth = data.pageWidth || 1920
    state.pageHeight = data.pageHeight || 1080
    state.pageBackground = data.pageBackground || '#ffffff'
    state.nextId = data.nextId || 1
    state.selectedId = null
    state.history = [JSON.parse(JSON.stringify(state.components))]
    state.historyIndex = 0
    state.clipboard = []
    return true
  } catch {
    return false
  }
}
```

注意：`import` 语句放在文件顶部不合适（会导致循环依赖风险），应放在文件末尾的导出函数之前，或将 import 放在文件顶部。实际上将 import 放在顶部更好——`builderApi.js` 不依赖 `stageEditor.js`，不会有循环。

把 `import { apiLoadDocuments, apiSaveDocument } from '../builderApi.js'` 放在文件顶部（第 1 行之后）。将两个新函数追加在现有 `load()` 函数之后。

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/stageEditor.js
git commit -m "feat: add saveToDB/loadFromDB to stageEditor for database persistence"
```

---

### Task 8: EditorCanvas.vue — saveKey → documentType + dossierId

**Files:**
- Modify: `src/modules/builder/editor/EditorCanvas.vue`

**Interfaces:**
- Consumes: `stageEditor.js` (saveToDB, loadFromDB)
- Produces: `documentType` prop (`'editor'|'display'`), `dossierId` prop (String)

- [ ] **Step 1: 修改 EditorCanvas.vue 的 props**

在 `<script setup>` 中，将 `saveKey` prop 替换为 `documentType` + `dossierId`：

```js
const props = defineProps({
  documentType: {
    type: String,
    default: 'editor',   // 'editor' | 'display'
  },
  dossierId: {
    type: String,
    default: '',
  },
})
// 保留 ZOOM_OPTIONS 等不变
```

同时从 import 中添加 `saveToDB, loadFromDB`：

```js
import {
  state, addComponentAt, selectComponent,
  selectByRect, deleteComponent, bringToFront, cloneComponent,
  copySelected, pasteClipboard, undo, redo, setZoom, pushHistory, save, getSelected, load,
  saveToDB, loadFromDB,
} from './stageEditor.js'
```

- [ ] **Step 2: 修改 onSave() 函数**

```js
async function onSave() {
  if (props.dossierId) {
    try {
      await saveToDB(props.dossierId, props.documentType)
      alert('✅ 已保存到数据库')
    } catch (e) {
      alert('❌ 保存失败：' + (e.message || '未知错误'))
    }
  } else {
    // 无 dossierId 时回退到 localStorage（向后兼容）
    save(props.documentType === 'display' ? 'builder-display-save' : 'builder-save')
    alert('⚠️ 已保存到本地（请先选择实践档案以保存到数据库）')
  }
}
```

- [ ] **Step 3: 修改 onMounted 中的 load 调用**

```js
onMounted(async () => {
  document.addEventListener('keydown', onKeyDown)
  if (viewportRef.value) {
    viewportRef.value.addEventListener('contextmenu', onStageContextMenu)
  }
  document.addEventListener('click', onGlobalClick)

  if (props.dossierId) {
    await loadFromDB(props.dossierId, props.documentType)
  } else {
    load(props.documentType === 'display' ? 'builder-display-save' : 'builder-save')
  }
})
```

- [ ] **Step 4: 修改 onSaveAsBigComponent 函数**

```js
async function onSaveAsBigComponent() {
  if (state.selectedId === null) return
  if (!props.dossierId) {
    alert('⚠️ 请先选择实践档案')
    return
  }
  const selected = state.components.filter(c => c.id === state.selectedId)
  if (!selected.length) return

  const name = window.prompt('请输入大组件名称：', '我的大组件')
  if (!name || !name.trim()) return

  // 导入并使用新的 API-backed saveBigComponent
  const { saveBigComponent } = await import('../display/bigComponentStore.js')
  try {
    await saveBigComponent(props.dossierId, name.trim(), selected)
    alert('✅ 已收录到自定义大组件库')
  } catch (e) {
    alert('❌ 保存大组件失败：' + (e.message || '未知错误'))
  }
}
```

- [ ] **Step 5: 修改 onDrop 中的 big-component 处理**

在 `onDrop` 函数中，big-component 的 drag data 保持不变（`e.dataTransfer.setData` 已携带 `bigComponentId`），但 drop 时需要异步加载 big component children。修改 `onDrop` 中 `info.type === 'big-component'` 分支为 async：

```js
async function onDrop(e) {
  e.preventDefault()
  const raw = e.dataTransfer.getData('text/plain')
  if (!raw) return
  let info
  try { info = JSON.parse(raw) } catch { return }
  const rect = viewportRef.value.getBoundingClientRect()
  const x = (e.clientX - rect.left + viewportRef.value.scrollLeft) / state.zoom
  const y = (e.clientY - rect.top + viewportRef.value.scrollTop) / state.zoom

  if (info.type === 'big-component' && info.bigComponentId) {
    const { loadBigComponents } = await import('../display/bigComponentStore.js')
    const all = await loadBigComponents(props.dossierId)
    const bc = all.find(b => b.id === info.bigComponentId)
    if (!bc) return
    const baseX = Math.round(x)
    const baseY = Math.round(y)
    const children = JSON.parse(bc.payload).children
    children.forEach(child => {
      const comp = JSON.parse(JSON.stringify(child))
      comp.id = state.nextId++
      comp.x = baseX + (comp.x || 0)
      comp.y = baseY + (comp.y || 0)
      state.components.push(comp)
    })
    if (children.length > 0) {
      state.selectedId = state.components[state.components.length - 1].id
    }
    pushHistory()
  } else {
    addComponentAt(info.type, Math.round(x), Math.round(y))
  }
}
```

- [ ] **Step 6: Commit**

```bash
git add src/modules/builder/editor/EditorCanvas.vue
git commit -m "feat: switch EditorCanvas from saveKey to documentType + dossierId"
```

---

### Task 9: BigComponentEditor.vue — 集成 dossierId 和 DossierPicker

**Files:**
- Modify: `src/modules/builder/editor/BigComponentEditor.vue`

- [ ] **Step 1: 修改 BigComponentEditor.vue**

在 template 的 `<EditorCanvas />` 上添加 `documentType` 和 `dossierId` props，并在顶栏区域加入 DossierPicker：

```vue
<template>
  <div class="editor-root">
    <!-- DossierPicker 嵌入顶栏区域 -->
    <div class="editor-dossier-bar">
      <DossierPicker :dossier-id="dossierId" />
    </div>

    <!-- Left Panel: Component Library -->
    <aside class="editor-left" :class="{ collapsed: leftCollapsed }">
      <ComponentLibrary v-if="!leftCollapsed" />
      <button class="toggle-btn" @click="leftCollapsed = !leftCollapsed" :title="leftCollapsed ? '展开组件库' : '收起组件库'">
        {{ leftCollapsed ? '▶' : '◀' }}
      </button>
    </aside>

    <!-- Center: Canvas -->
    <main class="editor-center">
      <EditorCanvas document-type="editor" :dossier-id="dossierId" />
    </main>

    <!-- Right Panel: Properties -->
    <aside class="editor-right" :class="{ collapsed: !state.selectedId }">
      <PropertyPanel />
    </aside>
  </div>
</template>
```

在 `<script setup>` 中添加：

```js
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import ComponentLibrary from './ComponentLibrary.vue'
import EditorCanvas from './EditorCanvas.vue'
import PropertyPanel from './PropertyPanel.vue'
import { state } from './stageEditor.js'
import DossierPicker from '../DossierPicker.vue'

const route = useRoute()
const leftCollapsed = ref(false)

const dossierId = computed(() => route.params.dossierId || '')
```

移除原有的 `import { load } from './stageEditor.js'` 行和 `onMounted(() => { load() })` 调用（EditorCanvas 自己负责加载）。

添加 dossier bar 样式：

```css
.editor-dossier-bar {
  display: flex; align-items: center; justify-content: flex-start;
  padding: 0.4rem 1rem;
  background: var(--editor-topbar-bg);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 20px;
  margin-bottom: 8px;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/editor/BigComponentEditor.vue
git commit -m "feat: integrate DossierPicker and dossierId into BigComponentEditor"
```

---

### Task 10: DisplayWorkbench.vue — 集成 dossierId 和 DossierPicker

**Files:**
- Modify: `src/modules/builder/display/DisplayWorkbench.vue`

- [ ] **Step 1: 修改 DisplayWorkbench.vue**

与 BigComponentEditor 类似的改造：

```vue
<template>
  <div class="editor-root">
    <!-- DossierPicker -->
    <div class="editor-dossier-bar">
      <DossierPicker :dossier-id="dossierId" />
    </div>

    <!-- Left Panel: Extended Component Library -->
    <aside class="editor-left" :class="{ collapsed: leftCollapsed }">
      <DisplayComponentLibrary ref="libRef" v-if="!leftCollapsed" :dossier-id="dossierId" />
      <button class="toggle-btn" @click="leftCollapsed = !leftCollapsed" :title="leftCollapsed ? '展开组件库' : '收起组件库'">
        {{ leftCollapsed ? '▶' : '◀' }}
      </button>
    </aside>

    <!-- Center: Canvas -->
    <main class="editor-center">
      <EditorCanvas document-type="display" :dossier-id="dossierId" />
    </main>

    <!-- Right Panel: Properties -->
    <aside class="editor-right" :class="{ collapsed: !state.selectedId }">
      <PropertyPanel />
    </aside>
  </div>
</template>
```

在 `<script setup>` 中：

```js
import { ref, computed, watch, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import DisplayComponentLibrary from './DisplayComponentLibrary.vue'
import EditorCanvas from '../editor/EditorCanvas.vue'
import PropertyPanel from '../editor/PropertyPanel.vue'
import { state, resetState } from '../editor/stageEditor.js'
import DossierPicker from '../DossierPicker.vue'

const route = useRoute()
const leftCollapsed = ref(false)
const libRef = ref(null)

const dossierId = computed(() => route.params.dossierId || '')

onMounted(() => {
  resetState()
  // EditorCanvas will load from DB (or localStorage fallback) via its onMounted
})

// When dossierId changes, reset and reload
watch(dossierId, () => {
  resetState()
  if (libRef.value?.refreshBigComponents) {
    libRef.value.refreshBigComponents()
  }
})
```

添加与 BigComponentEditor 相同的 `.editor-dossier-bar` 样式。

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/display/DisplayWorkbench.vue
git commit -m "feat: integrate DossierPicker and dossierId into DisplayWorkbench"
```

---

### Task 11: bigComponentStore.js — localStorage → API

**Files:**
- Modify: `src/modules/builder/display/bigComponentStore.js`

**Interfaces:**
- Consumes: `builderApi.js` (apiLoadDocuments, apiSaveDocument, apiDeleteDocument)
- Produces: `loadBigComponents(dossierId)` (async), `saveBigComponent(dossierId, name, children)` (async), `deleteBigComponent(id)` (async)

- [ ] **Step 1: 重写 bigComponentStore.js**

```js
// Big component CRUD backed by /api/builder (database).
// Each dossier has its own big component library.
import { apiLoadDocuments, apiSaveDocument, apiDeleteDocument } from '../builderApi.js'

/**
 * Load all big components for a dossier.
 * @param {string} dossierId
 * @returns {Promise<Array>} — each item is the full document row { id, type, name, payload, ... }
 */
export async function loadBigComponents(dossierId) {
  try {
    return await apiLoadDocuments(dossierId, 'big-component')
  } catch {
    return []
  }
}

/**
 * Save a new big component with normalized coordinates.
 * @param {string} dossierId
 * @param {string} name
 * @param {Array} children — array of canvas component objects
 * @returns {Promise<object>} the saved document
 */
export async function saveBigComponent(dossierId, name, children) {
  // Deep clone children so originals are not mutated
  const cloned = JSON.parse(JSON.stringify(children))

  // Compute minX and minY
  const minX = Math.min(...cloned.map((c) => c.x))
  const minY = Math.min(...cloned.map((c) => c.y))

  // Normalize coordinates
  for (const child of cloned) {
    child.x -= minX
    child.y -= minY
  }

  // Compute total dimensions
  let totalWidth = 0
  let totalHeight = 0
  for (const child of cloned) {
    const right = child.x + child.width
    const bottom = child.y + child.height
    if (right > totalWidth) totalWidth = right
    if (bottom > totalHeight) totalHeight = bottom
  }

  const payload = JSON.stringify({
    children: cloned,
    totalWidth,
    totalHeight,
    thumbnail: '',
    createdAt: Date.now(),
  })

  return apiSaveDocument(dossierId, {
    type: 'big-component',
    name,
    payload,
  })
}

/**
 * Delete a big component by document id.
 * @param {string} id — document id (not the old localStorage bc_xxx id)
 */
export async function deleteBigComponent(id) {
  try {
    await apiDeleteDocument(id)
  } catch {
    // Silently ignore errors
  }
}
```

注意：`getBigComponent` 函数已不再需要（DisplayComponentLibrary 改为通过 `loadBigComponents` 批量获取后用 `find` 在内存中查找）。如果仍有外部调用，可保留为：

```js
/** @deprecated — use loadBigComponents + find instead */
export async function getBigComponent(dossierId, bigComponentId) {
  const all = await loadBigComponents(dossierId)
  return all.find((bc) => bc.id === bigComponentId)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/display/bigComponentStore.js
git commit -m "feat: migrate bigComponentStore from localStorage to API"
```

---

### Task 12: DisplayComponentLibrary.vue — 接收 dossierId

**Files:**
- Modify: `src/modules/builder/display/DisplayComponentLibrary.vue`

- [ ] **Step 1: 修改 DisplayComponentLibrary.vue**

添加 `dossierId` prop 并改造 `refreshBigComponents` 和 `deleteCtxItem`：

在 `<script setup>` 中修改 props 和函数：

```js
const props = defineProps({
  dossierId: { type: String, default: '' },
})

// ...

async function refreshBigComponents() {
  if (!props.dossierId) {
    bigComponents.value = []
    return
  }
  const docs = await loadBigComponents(props.dossierId)
  bigComponents.value = docs
}

async function deleteCtxItem() {
  if (ctxMenu.value.item) {
    await deleteBigComponent(ctxMenu.value.item.bigComponentId)
    await refreshBigComponents()
  }
  ctxMenu.value = { show: false, x: 0, y: 0, item: null }
}
```

同时修改 `customBigCategory` computed 中 items 的映射，因为从 API 返回的文档格式不同（有 `id`, `name`, `payload` 字段）：

```js
const customBigCategory = {
  id: 'custom-big',
  icon: '🧩',
  name: '自定义大组件',
  items: bigComponents.value.map(bc => ({
    label: bc.name || '未命名',
    icon: '📦',
    type: 'big-component',
    bigComponentId: bc.id,  // 这是数据库文档的 id
  })),
}
```

在 `onDragStart` 中的拖拽数据保持 `bigComponentId: item.bigComponentId` 不变。

- [ ] **Step 2: Commit**

```bash
git add src/modules/builder/display/DisplayComponentLibrary.vue
git commit -m "feat: add dossierId prop to DisplayComponentLibrary"
```

---

### Task 13: StageResult.vue — 导航带 dossierId

**Files:**
- Modify: `src/modules/practice/mine/StageResult.vue`

- [ ] **Step 1: 修改 StageResult.vue 的 onDiy 函数**

```js
const props = defineProps({
  dossier: { type: Object, required: true },
})

const router = useRouter()
function onDiy() {
  router.push(`/builder/display/${props.dossier.id}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/practice/mine/StageResult.vue
git commit -m "feat: navigate to builder display with dossierId from StageResult"
```

---

### Task 14: 端到端验证

- [ ] **Step 1: 启动后端和前端**

```bash
# Terminal 1 — 后端
cd server && node index.js
# 预期：Listening on http://localhost:3001

# Terminal 2 — 前端
npm run dev
# 预期：Vite dev server on http://localhost:5173
```

- [ ] **Step 2: 验证完整流程**

1. 打开浏览器 `http://localhost:5173/#/practice/mine`
2. 登录（或注册）一个用户
3. 加入一个队伍，创建一个实践档案（dossier）
4. 进入该 dossier，到达 StageResult 页面
5. 点击「进入成果搭建台 DIY ↗」按钮
6. 应该导航到 `/builder/display/<dossierId>`，顶部 DossierPicker 显示当前 dossier 名称
7. 拖放一些组件到画布上
8. 点击「💾 保存」按钮 — 应显示"已保存到数据库"
9. 刷新页面 — 画布应恢复之前的组件
10. 选中组件，点击「📦 保存为大组件」— 输入名称，确认
11. 左侧组件库「自定义大组件」分类中出现刚才保存的大组件
12. 拖放大组件到画布 — 正常工作
13. 右键大组件 → 删除 — 正常删除

- [ ] **Step 3: 验证从 BuilderHub 无上下文的入口**

1. 导航到 `/#/builder`
2. 点击进入「大组件编辑台」
3. 顶部 DossierPicker 显示"选择关联的实践档案"
4. 点击「选择」，下拉列出所有团队的实践档案
5. 选择一个 dossier
6. URL 变为 `/builder/editor/<dossierId>`
7. 保存 → 数据库保存成功
8. 刷新 → 数据恢复

- [ ] **Step 4: Commit**

```bash
git commit -m "verify: end-to-end builder DB storage flow"
```
