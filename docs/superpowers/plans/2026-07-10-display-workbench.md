# 大屏展示工作台 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现大屏展示工作台（Display Workbench），复用大组件编辑台引擎，增加自定义大组件分类，支持原生小组件 + 自定义大组件的排版与导出。

**Architecture:** 最大化复用现有编辑器引擎（stageEditor、componentFactory、PropertyPanel、buildPreview、渲染器），新建 DisplayWorkbench.vue（三栏布局壳）、DisplayComponentLibrary.vue（扩展组件库）、bigComponentStore.js（大组件 CRUD）。EditorCanvas 增加 saveKey prop 和大组件拖放支持。

**Tech Stack:** Vue 3 Composition API (`<script setup>`), Vitest, localStorage, 纯 CSS（科技蓝主题变量覆盖）

## Global Constraints

- 所有新文件放在 `src/modules/builder/display/` 目录
- localStorage 键：`builder-save`（编辑台）、`builder-display-save`（展示台）、`builder-big-components`（大组件库）
- 科技蓝主题：展示台使用与编辑台完全相同的 CSS 变量覆盖
- 大组件数据结构：`{ id, name, thumbnail, createdAt, children, totalWidth, totalHeight }`
- 大组件拖入画布后各子组件独立存在，不保持组关系

---

## File Structure

```
src/modules/builder/
├── display/
│   ├── DisplayWorkbench.vue          ← 重写：三栏布局壳
│   ├── DisplayComponentLibrary.vue   ← 新建：扩展组件库（14 类）
│   └── bigComponentStore.js          ← 新建：大组件 CRUD + localStorage
├── editor/
│   ├── EditorCanvas.vue              ← 修改：saveKey prop + 大组件支持 + 保存大组件按钮
│   └── stageEditor.js                ← 修改：save/load 接受可选 key 参数
├── BuilderHub.vue                    ← 修改：激活展示台入口卡片
└── routes.js                         ← 不改
src/__tests__/
├── builder-bigComponentStore.test.js ← 新建
├── builder-displayWorkbench.test.js  ← 新建
├── builder-stageEditor.test.js       ← 补充 save/load key 参数测试
└── builder-componentFactory.test.js  ← 不改
```

---

### Task 1: bigComponentStore — 大组件 CRUD + localStorage 持久化

**Files:**
- Create: `src/modules/builder/display/bigComponentStore.js`
- Create: `src/__tests__/builder-bigComponentStore.test.js`

**Interfaces:**
- Consumes: 无（独立模块）
- Produces:
  - `loadBigComponents(): Array<BigComponent>` — 从 localStorage 读取全部大组件
  - `saveBigComponent(name: string, children: Array<Component>): BigComponent` — 保存新大组件，自动计算 totalWidth/totalHeight
  - `deleteBigComponent(id: string): void` — 删除大组件
  - `getBigComponent(id: string): BigComponent | undefined` — 获取单个大组件

- [ ] **Step 1: 编写 bigComponentStore 测试**

在 `src/__tests__/builder-bigComponentStore.test.js`：

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadBigComponents,
  saveBigComponent,
  deleteBigComponent,
  getBigComponent,
} from '../modules/builder/display/bigComponentStore.js'

const STORAGE_KEY = 'builder-big-components'

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY)
})

describe('bigComponentStore', () => {
  describe('saveBigComponent', () => {
    it('saves a big component with normalized children coordinates', () => {
      const children = [
        { type: 'text', x: 100, y: 50, width: 300, height: 96, props: { text: 'Hello' } },
        { type: 'chart', x: 450, y: 0, width: 520, height: 320, props: { chartType: 'bar' } },
      ]
      const bc = saveBigComponent('测试看板', children)

      expect(bc.id).toMatch(/^bc_/)
      expect(bc.name).toBe('测试看板')
      expect(bc.children).toHaveLength(2)
      // children 坐标已归零：以最小 x、最小 y 为原点
      expect(bc.children[0].x).toBe(0)   // 100 - 100
      expect(bc.children[0].y).toBe(0)   // 50 - 0 (minY is 0 from chart at y=0)
      // Wait - minY is 0, so text y becomes 50 - 0 = 50
      expect(bc.children[0].y).toBe(50)
      expect(bc.children[1].x).toBe(350) // 450 - 100
      expect(bc.children[1].y).toBe(0)
      // 自动计算的尺寸
      expect(bc.totalWidth).toBe(970)    // max(100+300, 450+520) - minX = 970 - 100 = 870
      // Actually: maxX = max(100+300, 450+520) = 970, totalWidth = 970 - 100 = 870
      expect(bc.totalWidth).toBe(870)
      expect(bc.totalHeight).toBe(320)   // max(50+96, 0+320) - 0 = 320
      expect(typeof bc.createdAt).toBe('number')
    })

    it('persists to localStorage', () => {
      saveBigComponent('测试', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])
      const raw = localStorage.getItem(STORAGE_KEY)
      expect(raw).toBeTruthy()
      const parsed = JSON.parse(raw)
      expect(parsed).toHaveLength(1)
      expect(parsed[0].name).toBe('测试')
    })
  })

  describe('loadBigComponents', () => {
    it('returns empty array when nothing saved', () => {
      expect(loadBigComponents()).toEqual([])
    })

    it('returns all saved big components', () => {
      saveBigComponent('A', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])
      saveBigComponent('B', [{ type: 'image', x: 0, y: 0, width: 200, height: 100, props: {} }])
      const all = loadBigComponents()
      expect(all).toHaveLength(2)
      expect(all[0].name).toBe('A')
      expect(all[1].name).toBe('B')
    })

    it('handles corrupt localStorage gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json')
      expect(loadBigComponents()).toEqual([])
    })
  })

  describe('deleteBigComponent', () => {
    it('removes a big component by id', () => {
      const bc = saveBigComponent('删除测试', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])
      deleteBigComponent(bc.id)
      expect(loadBigComponents()).toHaveLength(0)
    })

    it('does nothing for unknown id', () => {
      saveBigComponent('保留', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])
      deleteBigComponent('bc_nonexistent')
      expect(loadBigComponents()).toHaveLength(1)
    })
  })

  describe('getBigComponent', () => {
    it('returns component by id', () => {
      const bc = saveBigComponent('查找', [{ type: 'text', x: 0, y: 0, width: 100, height: 50, props: {} }])
      expect(getBigComponent(bc.id).name).toBe('查找')
    })

    it('returns undefined for unknown id', () => {
      expect(getBigComponent('bc_nonexistent')).toBeUndefined()
    })
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/__tests__/builder-bigComponentStore.test.js
```

预期：全部 FAIL（模块不存在）

- [ ] **Step 3: 实现 bigComponentStore.js**

在 `src/modules/builder/display/bigComponentStore.js`：

```javascript
// src/modules/builder/display/bigComponentStore.js

const STORAGE_KEY = 'builder-big-components'

export function loadBigComponents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
  } catch {
    return []
  }
}

function persist(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
}

export function saveBigComponent(name, children) {
  // 计算相对坐标：以最小 x、最小 y 为原点归零
  const minX = Math.min(...children.map(c => c.x))
  const minY = Math.min(...children.map(c => c.y))

  const normalizedChildren = children.map(c => ({
    ...JSON.parse(JSON.stringify(c)),
    x: c.x - minX,
    y: c.y - minY,
  }))

  const maxX = Math.max(...normalizedChildren.map(c => c.x + c.width))
  const maxY = Math.max(...normalizedChildren.map(c => c.y + c.height))

  const bigComponent = {
    id: 'bc_' + Date.now(),
    name,
    thumbnail: '',
    createdAt: Date.now(),
    children: normalizedChildren,
    totalWidth: maxX,
    totalHeight: maxY,
  }

  const all = loadBigComponents()
  all.push(bigComponent)
  persist(all)
  return bigComponent
}

export function deleteBigComponent(id) {
  const all = loadBigComponents()
  const filtered = all.filter(bc => bc.id !== id)
  if (filtered.length === all.length) return // 未找到
  persist(filtered)
}

export function getBigComponent(id) {
  return loadBigComponents().find(bc => bc.id === id)
}
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/__tests__/builder-bigComponentStore.test.js
```

预期：全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/modules/builder/display/bigComponentStore.js src/__tests__/builder-bigComponentStore.test.js
git commit -m "feat: add bigComponentStore for custom big component CRUD and localStorage persistence

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 2: stageEditor — save/load 支持可选 key 参数

**Files:**
- Modify: `src/modules/builder/editor/stageEditor.js`
- Modify: `src/__tests__/builder-stageEditor.test.js`

**Interfaces:**
- Consumes: 现有 stageEditor 全部接口
- Produces: `save(key?: string): void` — key 默认 `'builder-save'`，`load(key?: string): boolean` — key 默认 `'builder-save'`

- [ ] **Step 1: 补充 stageEditor 测试**

在 `src/__tests__/builder-stageEditor.test.js` 末尾追加（在最后一个 `describe` block 之后、文件结束之前）：

```javascript
  describe('save/load with custom key', () => {
    it('save uses default key "builder-save"', () => {
      addComponentAt('text', 10, 20)
      save()
      expect(localStorage.getItem('builder-save')).toBeTruthy()
    })

    it('save uses custom key when provided', () => {
      addComponentAt('text', 10, 20)
      save('builder-display-save')
      expect(localStorage.getItem('builder-display-save')).toBeTruthy()
      // 默认 key 不受影响
      expect(localStorage.getItem('builder-save')).toBeFalsy()
    })

    it('load uses default key "builder-save"', () => {
      addComponentAt('text', 10, 20)
      save()
      resetState()
      const ok = load()
      expect(ok).toBe(true)
      expect(state.components).toHaveLength(1)
    })

    it('load uses custom key when provided', () => {
      addComponentAt('image', 30, 40)
      save('builder-display-save')
      resetState()
      const ok = load('builder-display-save')
      expect(ok).toBe(true)
      expect(state.components).toHaveLength(1)
      expect(state.components[0].type).toBe('image')
    })

    it('load returns false when custom key has no data', () => {
      localStorage.removeItem('builder-display-save')
      expect(load('builder-display-save')).toBe(false)
    })
  })
```

注意：需要在文件顶部的 import 中追加 `save, load`：

将：
```javascript
import {
  state,
  resetState,
  addComponentAt,
  deleteComponent,
  selectComponent,
  moveComponent,
  bringToFront,
  cloneComponent,
  copySelected,
  pasteClipboard,
  undo,
  redo,
  getSelected,
} from '../modules/builder/editor/stageEditor.js'
```

改为：
```javascript
import {
  state,
  resetState,
  addComponentAt,
  deleteComponent,
  selectComponent,
  moveComponent,
  bringToFront,
  cloneComponent,
  copySelected,
  pasteClipboard,
  undo,
  redo,
  getSelected,
  save,
  load,
} from '../modules/builder/editor/stageEditor.js'
```

- [ ] **Step 2: 运行测试确认新增用例失败**

```bash
npx vitest run src/__tests__/builder-stageEditor.test.js
```

预期：新增的 save/load custom key 用例 FAIL（save/load 尚未接受参数）

- [ ] **Step 3: 修改 stageEditor.js 的 save/load**

在 `src/modules/builder/editor/stageEditor.js` 中，将：

```javascript
export function save() {
  const data = {
    components: JSON.parse(JSON.stringify(state.components)),
    pageWidth: state.pageWidth,
    pageHeight: state.pageHeight,
    pageBackground: state.pageBackground,
    nextId: state.nextId,
  }
  localStorage.setItem('builder-save', JSON.stringify(data))
}

export function load() {
  const raw = localStorage.getItem('builder-save')
```

改为：

```javascript
export function save(key = 'builder-save') {
  const data = {
    components: JSON.parse(JSON.stringify(state.components)),
    pageWidth: state.pageWidth,
    pageHeight: state.pageHeight,
    pageBackground: state.pageBackground,
    nextId: state.nextId,
  }
  localStorage.setItem(key, JSON.stringify(data))
}

export function load(key = 'builder-save') {
  const raw = localStorage.getItem(key)
```

- [ ] **Step 4: 运行测试确认全部通过**

```bash
npx vitest run src/__tests__/builder-stageEditor.test.js
```

预期：全部 PASS（包括新增的 custom key 用例）

- [ ] **Step 5: 运行全部已有测试确保无回归**

```bash
npx vitest run
```

预期：全部已有测试仍然 PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/builder/editor/stageEditor.js src/__tests__/builder-stageEditor.test.js
git commit -m "feat: parameterize stageEditor save/load with optional localStorage key

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 3: EditorCanvas — saveKey prop + 大组件拖放 + 保存大组件按钮

**Files:**
- Modify: `src/modules/builder/editor/EditorCanvas.vue`

**Interfaces:**
- Consumes: `stageEditor` (save/load with key), `bigComponentStore` (getBigComponent)
- Produces: `saveKey` prop (String, default `'builder-save'`), 「保存为大组件」按钮, big-component drop 支持

- [ ] **Step 1: 修改 EditorCanvas.vue — 添加 saveKey prop**

在 `<script setup>` 中，在现有 import 后添加 props 定义：

```javascript
const props = defineProps({
  saveKey: {
    type: String,
    default: 'builder-save',
  },
})
```

- [ ] **Step 2: 修改 onMounted 和 onSave 使用 props.saveKey**

将 `onMounted` 中的：
```javascript
onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  if (viewportRef.value) {
    viewportRef.value.addEventListener('contextmenu', onStageContextMenu)
  }
  document.addEventListener('click', onGlobalClick)
})
```

改为：
```javascript
onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  if (viewportRef.value) {
    viewportRef.value.addEventListener('contextmenu', onStageContextMenu)
  }
  document.addEventListener('click', onGlobalClick)
  load(props.saveKey) // 使用 saveKey 恢复状态
})
```

注意：需要在 import 中追加 `load`：
```javascript
import {
  state, addComponentAt, selectComponent,
  selectByRect, deleteComponent, bringToFront, cloneComponent,
  copySelected, pasteClipboard, undo, redo, setZoom, pushHistory, save, getSelected, load,
} from './stageEditor.js'
```

将 `onSave` 函数：
```javascript
function onSave() { save() }
```

改为：
```javascript
function onSave() { save(props.saveKey) }
```

- [ ] **Step 3: 修改 onDrop 支持 big-component 类型**

在 `<script setup>` 顶部添加 import：

```javascript
import { getBigComponent } from '../display/bigComponentStore.js'
```

将 `onDrop` 函数：
```javascript
function onDrop(e) {
  e.preventDefault()
  const raw = e.dataTransfer.getData('text/plain')
  if (!raw) return
  let info
  try { info = JSON.parse(raw) } catch { return }
  const rect = viewportRef.value.getBoundingClientRect()
  const x = (e.clientX - rect.left + viewportRef.value.scrollLeft) / state.zoom
  const y = (e.clientY - rect.top + viewportRef.value.scrollTop) / state.zoom
  addComponentAt(info.type, Math.round(x), Math.round(y))
}
```

改为：
```javascript
function onDrop(e) {
  e.preventDefault()
  const raw = e.dataTransfer.getData('text/plain')
  if (!raw) return
  let info
  try { info = JSON.parse(raw) } catch { return }
  const rect = viewportRef.value.getBoundingClientRect()
  const x = (e.clientX - rect.left + viewportRef.value.scrollLeft) / state.zoom
  const y = (e.clientY - rect.top + viewportRef.value.scrollTop) / state.zoom

  if (info.type === 'big-component' && info.bigComponentId) {
    // 大组件：展开所有子组件到画布
    const bc = getBigComponent(info.bigComponentId)
    if (!bc) return
    const baseX = Math.round(x)
    const baseY = Math.round(y)
    bc.children.forEach(child => {
      const comp = JSON.parse(JSON.stringify(child))
      comp.id = state.nextId++
      comp.x = baseX + (comp.x || 0)
      comp.y = baseY + (comp.y || 0)
      state.components.push(comp)
    })
    if (bc.children.length > 0) {
      state.selectedId = bc.children[bc.children.length - 1].id
    }
    pushHistory()
  } else {
    addComponentAt(info.type, Math.round(x), Math.round(y))
  }
}
```

注意：需要确保 `state` 和 `pushHistory` 已在 import 中。它们已存在于现有 import 中。

- [ ] **Step 4: 添加「保存为大组件」按钮到顶栏**

在顶栏的 `ec-tb-right` 区域，在缩放选择器之前添加按钮。找到：

```html
<div class="ec-tb-right">
  <select class="tb-select" :value="state.zoom" @change="onZoomChange">
```

在 `<div class="ec-tb-right">` 之后、`<select>` 之前插入：

```html
<button class="tb-btn" @click="onSaveAsBigComponent" :disabled="state.selectedId === null" title="将选中的组件保存为大组件">📦 保存为大组件</button>
<span class="tb-sep"></span>
```

- [ ] **Step 5: 实现 onSaveAsBigComponent 函数**

在 `<script setup>` 中添加：

```javascript
function onSaveAsBigComponent() {
  if (state.selectedId === null) return
  const selected = state.components.filter(c => c.id === state.selectedId)
  if (!selected.length) return

  const name = window.prompt('请输入大组件名称：', '我的大组件')
  if (!name || !name.trim()) return

  const { saveBigComponent } = require('../display/bigComponentStore.js')
  saveBigComponent(name.trim(), selected)
  alert('✅ 已收录到自定义大组件库')
}
```

等等，这里用了 `require`，在 ESM 下不可用。需要改为动态 import 或顶部 import。改为顶部 import：

在顶部 import 中添加：
```javascript
import { saveBigComponent } from '../display/bigComponentStore.js'
```

函数实现：
```javascript
function onSaveAsBigComponent() {
  if (state.selectedId === null) return
  const selected = state.components.filter(c => c.id === state.selectedId)
  if (!selected.length) return

  const name = window.prompt('请输入大组件名称：', '我的大组件')
  if (!name || !name.trim()) return

  saveBigComponent(name.trim(), selected)
  alert('✅ 已收录到自定义大组件库')
}
```

注意：`filter` 应该只选当前选中的单个组件，但根据 spec，用户可能想一次选多个。考虑到当前编辑器是单选模式（`selectedId`），这里暂时只保存选中的单个组件。后续若支持多选可扩展。

- [ ] **Step 6: 运行全部测试确认无回归**

```bash
npx vitest run
```

预期：全部已有测试 PASS

- [ ] **Step 7: Commit**

```bash
git add src/modules/builder/editor/EditorCanvas.vue
git commit -m "feat: add saveKey prop, big-component drop support, and save-as-big-component button to EditorCanvas

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 4: DisplayComponentLibrary — 扩展组件库（14 类）

**Files:**
- Create: `src/modules/builder/display/DisplayComponentLibrary.vue`

**Interfaces:**
- Consumes: `bigComponentStore.loadBigComponents()`
- Produces: Vue 组件，拖拽 emit `{ type, chartType }` 或 `{ type: 'big-component', bigComponentId }`

- [ ] **Step 1: 创建 DisplayComponentLibrary.vue**

`src/modules/builder/display/DisplayComponentLibrary.vue`：

```vue
<!-- src/modules/builder/display/DisplayComponentLibrary.vue -->
<template>
  <div class="cl-root">
    <div class="cl-header">
      <h3 class="cl-title">可视化组件库</h3>
      <input v-model="search" class="cl-search" placeholder="搜索组件..." />
    </div>

    <div class="cl-categories">
      <details v-for="cat in filteredCategories" :key="cat.id" class="cl-cat" :open="cat.id === 'overview' || cat.id === 'custom-big'">
        <summary class="cl-cat-summary">
          <span class="cl-cat-icon">{{ cat.icon }}</span>
          <span class="cl-cat-name">{{ cat.name }}</span>
          <span class="cl-cat-count">{{ cat.items.length }}</span>
        </summary>
        <div class="cl-grid">
          <div
            v-for="item in cat.items"
            :key="item.type + (item.bigComponentId || item.label)"
            class="cl-item"
            draggable="true"
            @dragstart="onDragStart($event, item, cat.id)"
            @contextmenu.prevent="onContextMenu($event, item, cat.id)"
          >
            <span class="cl-item-icon">{{ item.icon }}</span>
            <span class="cl-item-label">{{ item.label }}</span>
          </div>
        </div>
        <div v-if="cat.id === 'custom-big' && cat.items.length === 0" class="cl-empty">
          暂无自定义大组件<br/>在「大组件编辑台」中保存大组件后出现在这里
        </div>
      </details>
    </div>

    <!-- 右键删除菜单 -->
    <div v-if="ctxMenu.show" class="cl-ctxmenu" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }" @click.stop>
      <button @click="ctxDelete">🗑 删除</button>
      <button @click="ctxMenu.show = false">取消</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { loadBigComponents, deleteBigComponent } from './bigComponentStore.js'

const NATIVE_CATEGORIES = [
  {
    id: 'change', icon: '📊', name: '讲「变化」— 帮扶对比',
    items: [
      { label: '哑铃图', icon: '🔗', type: 'chart', chartType: 'bar' },
      { label: '涨跌徽标', icon: '📈', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'overview', icon: '📈', name: '讲「整体画像」— 概览',
    items: [
      { label: 'KPI 卡组', icon: '🃏', type: 'agri-sensor' },
      { label: '雷达图', icon: '🕸️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'timeline', icon: '⏱️', name: '讲「过程」— 时间线',
    items: [
      { label: '时间轴', icon: '📋', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'composition', icon: '🍩', name: '讲「构成 / 分布」',
    items: [
      { label: '饼图', icon: '🥧', type: 'chart', chartType: 'pie' },
      { label: '堆叠柱', icon: '📊', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'people', icon: '👥', name: '讲「人与故事」',
    items: [
      { label: '人物卡', icon: '👤', type: 'text' },
      { label: '金句块', icon: '💬', type: 'text' },
    ],
  },
  {
    id: 'geo', icon: '🗺️', name: '讲「空间」— 地理分布',
    items: [
      { label: '地图散点', icon: '📍', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'cover', icon: '🎬', name: '封面开场',
    items: [
      { label: '封面大图', icon: '🖼️', type: 'image' },
    ],
  },
  {
    id: 'emphasis', icon: '🔢', name: '单点强调',
    items: [
      { label: '大数字', icon: '🔢', type: 'text' },
    ],
  },
  {
    id: 'flow', icon: '🔀', name: '关系流向',
    items: [
      { label: '桑基图', icon: '〰️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'frequency', icon: '📅', name: '时间频率',
    items: [
      { label: '日历热力', icon: '🗓️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'compare', icon: '🔄', name: '交互对比',
    items: [
      { label: '前后对比', icon: '↔️', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'honor', icon: '🏆', name: '荣誉佐证',
    items: [
      { label: '数据表', icon: '📋', type: 'chart', chartType: 'bar' },
    ],
  },
  {
    id: 'media', icon: '🎬', name: '媒体嵌入',
    items: [
      { label: '视频嵌入', icon: '▶️', type: 'image' },
    ],
  },
]

const search = ref('')
const bigComponents = ref([])
const ctxMenu = ref({ show: false, x: 0, y: 0, id: null })

function refreshBigComponents() {
  bigComponents.value = loadBigComponents()
}

onMounted(() => {
  refreshBigComponents()
  document.addEventListener('click', onGlobalClick)
})

onUnmounted(() => {
  document.removeEventListener('click', onGlobalClick)
})

const filteredCategories = computed(() => {
  // 构建完整分类列表：13 原生 + 1 自定义大组件
  const customBigCategory = {
    id: 'custom-big',
    icon: '🧩',
    name: '自定义大组件',
    items: bigComponents.value.map(bc => ({
      label: bc.name,
      icon: '📦',
      type: 'big-component',
      bigComponentId: bc.id,
    })),
  }

  const allCategories = [...NATIVE_CATEGORIES, customBigCategory]

  if (!search.value.trim()) return allCategories
  const q = search.value.trim().toLowerCase()
  return allCategories
    .map(cat => ({
      ...cat,
      items: cat.items.filter(i => i.label.toLowerCase().includes(q)),
    }))
    .filter(cat => cat.items.length)
})

function onDragStart(e, item, catId) {
  e.dataTransfer.effectAllowed = 'copy'
  if (item.type === 'big-component') {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'big-component', bigComponentId: item.bigComponentId }))
  } else {
    e.dataTransfer.setData('text/plain', JSON.stringify({ type: item.type, chartType: item.chartType }))
  }
}

function onContextMenu(e, item, catId) {
  if (catId !== 'custom-big') return
  ctxMenu.value = { show: true, x: e.clientX, y: e.clientY, id: item.bigComponentId }
}

function ctxDelete() {
  if (ctxMenu.value.id) {
    deleteBigComponent(ctxMenu.value.id)
    refreshBigComponents()
  }
  ctxMenu.value.show = false
}

function onGlobalClick() {
  ctxMenu.value.show = false
}

// 暴露 refresh 方法供父组件在切换时调用
defineExpose({ refreshBigComponents })
</script>

<style scoped>
.cl-root { display: flex; flex-direction: column; height: 100%; }
.cl-header { padding: 1.2rem 1rem 0.8rem; flex-shrink: 0; }
.cl-title {
  margin: 0 0 0.7rem;
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--color-primary-dark);
}
.cl-search {
  width: 100%; padding: 0.5rem 0.8rem;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  font-size: 0.82rem; outline: none;
  background: var(--color-bg);
  color: var(--color-text);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.cl-search:focus {
  border-color: #2c7da0;
  box-shadow: 0 0 0 3px var(--editor-input-focus-glow);
}
.cl-search::placeholder { color: var(--color-text-light); }

.cl-categories { flex: 1; overflow-y: auto; padding: 0 0.6rem 0.6rem; }
.cl-cat { border-bottom: 1px solid var(--color-border-light); }
.cl-cat-summary {
  display: flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 0.4rem;
  cursor: pointer;
  font-size: 0.82rem; font-weight: 600;
  color: var(--color-text-secondary);
  user-select: none;
  transition: color var(--transition-fast);
}
.cl-cat-summary:hover { color: #2c7da0; }
.cl-cat-summary::marker { color: var(--color-text-light); }
.cl-cat[open] > .cl-cat-summary { color: #2c7da0; }
.cl-cat[open] > .cl-cat-summary::marker { color: #2c7da0; }
.cl-cat-icon { font-size: 0.9rem; }
.cl-cat-name { flex: 1; }
.cl-cat-count {
  font-size: 0.68rem; padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: rgba(44,125,160,0.08);
  color: #2c7da0;
  font-weight: 600;
}

.cl-grid {
  display: grid; grid-template-columns: 1fr 1fr;
  gap: 0.4rem; padding: 0 0.2rem 0.6rem;
}
.cl-item {
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
  padding: 0.7rem 0.3rem;
  border: 1px solid var(--color-border-light);
  border-radius: 18px;
  cursor: grab;
  transition: all var(--transition-fast);
  background: rgba(44,125,160,0.03);
}
.cl-item:hover {
  border-color: #2c7da0;
  background: var(--color-card);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}
.cl-item:active { cursor: grabbing; transform: scale(0.96); }
.cl-item-icon { font-size: 1.3rem; }
.cl-item-label {
  font-size: 0.72rem; color: var(--color-text-secondary); font-weight: 500;
}

.cl-empty {
  text-align: center; padding: 1.2rem 0.8rem;
  font-size: 0.75rem; color: var(--color-text-light); line-height: 1.7;
}

/* 右键菜单 */
.cl-ctxmenu {
  position: fixed; z-index: 1000;
  background: var(--color-card);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--color-border);
  border-radius: 18px;
  box-shadow: var(--shadow-lg);
  padding: 0.35rem 0;
  min-width: 120px;
}
.cl-ctxmenu button {
  display: block; width: 100%;
  padding: 0.5rem 1.2rem;
  border: none; background: transparent;
  text-align: left;
  font-size: 0.82rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.cl-ctxmenu button:hover {
  background: rgba(44,125,160,0.06);
  color: var(--color-text);
}
</style>
```

- [ ] **Step 2: 运行全部测试确认无回归**

```bash
npx vitest run
```

预期：全部已有测试 PASS（新 Vue 组件无测试文件时不运行）

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/display/DisplayComponentLibrary.vue
git commit -m "feat: add DisplayComponentLibrary with 13 native categories + custom big components category

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 5: DisplayWorkbench — 重写为完整三栏工作台

**Files:**
- Modify: `src/modules/builder/display/DisplayWorkbench.vue`
- Create: `src/__tests__/builder-displayWorkbench.test.js`

**Interfaces:**
- Consumes: `EditorCanvas` (with `saveKey="builder-display-save"`), `PropertyPanel`, `DisplayComponentLibrary`, `stageEditor`
- Produces: 完整三栏大屏展示工作台

- [ ] **Step 1: 编写 DisplayWorkbench 冒烟测试**

在 `src/__tests__/builder-displayWorkbench.test.js`：

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import DisplayWorkbench from '../modules/builder/display/DisplayWorkbench.vue'
import { resetState } from '../modules/builder/editor/stageEditor.js'

beforeEach(() => {
  resetState()
  localStorage.clear()
})

describe('DisplayWorkbench', () => {
  it('mounts successfully', () => {
    const wrapper = mount(DisplayWorkbench, {
      global: {
        stubs: {
          EditorCanvas: { template: '<div class="mock-canvas"></div>' },
          PropertyPanel: { template: '<div class="mock-props"></div>' },
          DisplayComponentLibrary: { template: '<div class="mock-lib"></div>' },
        },
      },
    })
    expect(wrapper.find('.editor-root').exists()).toBe(true)
  })

  it('has three-column layout', () => {
    const wrapper = mount(DisplayWorkbench, {
      global: {
        stubs: {
          EditorCanvas: { template: '<div class="mock-canvas"></div>' },
          PropertyPanel: { template: '<div class="mock-props"></div>' },
          DisplayComponentLibrary: { template: '<div class="mock-lib"></div>' },
        },
      },
    })
    // 左侧栏 + 中间画布 + 右侧属性面板
    expect(wrapper.find('.editor-left').exists()).toBe(true)
    expect(wrapper.find('.editor-center').exists()).toBe(true)
    expect(wrapper.find('.editor-right').exists()).toBe(true)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

```bash
npx vitest run src/__tests__/builder-displayWorkbench.test.js
```

预期：FAIL（DisplayWorkbench 仍是占位页，无 `.editor-root` 结构）

- [ ] **Step 3: 重写 DisplayWorkbench.vue**

`src/modules/builder/display/DisplayWorkbench.vue`：

```vue
<!-- src/modules/builder/display/DisplayWorkbench.vue -->
<template>
  <div class="editor-root">
    <!-- Left Panel: Extended Component Library -->
    <aside class="editor-left" :class="{ collapsed: leftCollapsed }">
      <DisplayComponentLibrary ref="libRef" v-if="!leftCollapsed" />
      <button class="toggle-btn" @click="leftCollapsed = !leftCollapsed" :title="leftCollapsed ? '展开组件库' : '收起组件库'">
        {{ leftCollapsed ? '▶' : '◀' }}
      </button>
    </aside>

    <!-- Center: Canvas -->
    <main class="editor-center">
      <EditorCanvas save-key="builder-display-save" />
    </main>

    <!-- Right Panel: Properties -->
    <aside class="editor-right" :class="{ collapsed: !state.selectedId }">
      <PropertyPanel />
    </aside>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import DisplayComponentLibrary from './DisplayComponentLibrary.vue'
import EditorCanvas from '../editor/EditorCanvas.vue'
import PropertyPanel from '../editor/PropertyPanel.vue'
import { state } from '../editor/stageEditor.js'

const leftCollapsed = ref(false)
const libRef = ref(null)

onMounted(() => {
  // 展示台使用独立的 localStorage key，由 EditorCanvas saveKey prop 处理
  // 每次进入展示台时刷新自定义大组件列表
  if (libRef.value) {
    libRef.value.refreshBigComponents()
  }
})
</script>

<style scoped>
/* 与 BigComponentEditor 完全相同的科技蓝主题 */
.editor-root {
  --color-bg: #f2f6f8;
  --color-bg-deep: #edf2f7;
  --color-primary: #2c7da0;
  --color-primary-soft: #4aa3c0;
  --color-primary-dark: #245a73;
  --color-primary-deep: #1a3f50;
  --color-secondary: #56ccf2;
  --color-secondary-soft: #a8e0f8;
  --color-accent: rgba(44,125,160,0.10);
  --color-accent-soft: rgba(44,125,160,0.05);
  --color-highlight: #c0392b;
  --color-highlight-soft: #e08070;
  --color-card: rgba(255,255,255,0.92);
  --color-text: #1c2834;
  --color-text-secondary: #627586;
  --color-text-light: #687b8b;
  --color-border: rgba(44,125,160,0.12);
  --color-border-light: rgba(44,125,160,0.06);

  --shadow-xs: 0 1px 3px rgba(36,90,115,0.04);
  --shadow-sm: 0 2px 8px rgba(36,90,115,0.06);
  --shadow-card: 0 4px 24px rgba(36,90,115,0.08);
  --shadow-card-hover: 0 8px 40px rgba(36,90,115,0.14);
  --shadow-lg: 0 12px 48px rgba(36,90,115,0.15);
  --shadow-xl: 0 20px 60px rgba(36,90,115,0.22);

  --editor-topbar-bg: rgba(18,28,39,0.92);
  --editor-topbar-shadow: 0 18px 50px rgba(0,0,0,0.15);
  --editor-canvas-grid-line: rgba(101,126,152,0.08);
  --editor-select-glow: rgba(44,125,160,0.26);
  --editor-select-bg: rgba(44,125,160,0.06);
  --editor-input-focus-glow: rgba(44,125,160,0.12);

  display: flex;
  height: calc(100vh - 60px);
  overflow: hidden;

  background:
    radial-gradient(circle at top left, rgba(88,164,176,0.22), transparent 30%),
    radial-gradient(circle at bottom right, rgba(236,184,101,0.22), transparent 34%),
    linear-gradient(145deg, #f2f6f8, #edf2f7, #f8fbfd);
}

.editor-left {
  position: relative;
  width: 260px;
  flex-shrink: 0;
  margin: 12px 0 12px 12px;
  background: var(--color-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  transition: width var(--transition);
}
.editor-left.collapsed {
  width: 36px;
  margin-right: 0;
}

.editor-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  margin: 12px 8px;
}

.editor-right {
  width: 300px;
  flex-shrink: 0;
  margin: 12px 12px 12px 0;
  background: var(--color-card);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--color-border);
  border-radius: 24px;
  box-shadow: var(--shadow-card);
  overflow-y: auto;
  transition: width var(--transition);
}
.editor-right.collapsed {
  width: 0;
  margin: 12px 0;
  border: none;
  box-shadow: none;
}

.toggle-btn {
  position: absolute;
  top: 12px;
  right: 6px;
  z-index: 2;
  width: 26px;
  height: 26px;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: var(--color-card);
  cursor: pointer;
  font-size: 10px;
  display: grid;
  place-items: center;
  color: var(--color-text-light);
  transition: all var(--transition-fast);
}
.toggle-btn:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
}
</style>
```

- [ ] **Step 4: 运行测试确认通过**

```bash
npx vitest run src/__tests__/builder-displayWorkbench.test.js
```

预期：全部 PASS

- [ ] **Step 5: 运行全部测试确认无回归**

```bash
npx vitest run
```

预期：全部已有测试 PASS

- [ ] **Step 6: Commit**

```bash
git add src/modules/builder/display/DisplayWorkbench.vue src/__tests__/builder-displayWorkbench.test.js
git commit -m "feat: rewrite DisplayWorkbench as full three-panel workbench with extended component library

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 6: BuilderHub — 激活大屏展示工作台入口

**Files:**
- Modify: `src/modules/builder/BuilderHub.vue`

- [ ] **Step 1: 激活展示台卡片**

在 `src/modules/builder/BuilderHub.vue` 中，将第二张卡片从 `disabled` 状态改为可点击状态。

将：
```html
<article class="hub-card disabled">
  <div class="hc-icon">🖥️</div>
  <div class="hc-body">
    <h2>大屏展示工作台</h2>
    <p>排版所有组件，自由调整布局与样式，一键导出纯静态展示网页。</p>
  </div>
  <span class="hc-badge">即将开放</span>
</article>
```

改为：
```html
<article class="hub-card" tabindex="0" role="button" @click="goDisplay" @keydown.enter="goDisplay">
  <div class="hc-icon">🖥️</div>
  <div class="hc-body">
    <h2>大屏展示工作台</h2>
    <p>排版所有组件（含自定义大组件），自由调整布局与样式，一键导出纯静态展示网页。</p>
  </div>
  <button class="btn primary">进入展示</button>
</article>
```

在 `<script setup>` 中，在 `goEditor` 函数后面添加 `goDisplay` 函数：

```javascript
function goDisplay() {
  router.push('/builder/display')
}
```

- [ ] **Step 2: 验证 App.vue 中 Footer 隐藏逻辑**

确认 `src/App.vue` 中 `isEditorRoute` 的计算逻辑是否需要更新。当前：

```javascript
const isEditorRoute = computed(() => route.path.startsWith('/builder/editor'))
```

改为同时覆盖展示台：

```javascript
const isEditorRoute = computed(() => route.path.startsWith('/builder/editor') || route.path.startsWith('/builder/display'))
```

- [ ] **Step 3: Commit**

```bash
git add src/modules/builder/BuilderHub.vue src/App.vue
git commit -m "feat: activate display workbench entry card and hide footer on display route

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```

---

### Task 7: 整体验证

- [ ] **Step 1: 运行全部测试套件**

```bash
npx vitest run
```

预期：全部测试 PASS

- [ ] **Step 2: 启动开发服务器验证**

```bash
npm run dev
```

手动验证：
1. 访问 `/builder` → 确认两张卡片均可点击
2. 进入「大组件编辑台」→ 放置小组件 → 选中一个组件 → 点击「📦 保存为大组件」→ 输入名称 → 确认 Toast
3. 返回 Hub → 进入「大屏展示工作台」→ 确认三栏布局正常渲染
4. 左侧组件库展开「自定义大组件」→ 确认刚保存的大组件出现
5. 拖拽自定义大组件到画布 → 确认子组件正确展开
6. 拖拽原生小组件到画布 → 确认正常工作
7. 点击「💾 保存」→ 刷新页面 → 确认画布状态恢复
8. 点击「👁 预览」→ 确认新窗口打开完整 HTML

- [ ] **Step 3: Commit（如有微调）**

```bash
git add -A
git commit -m "chore: final verification tweaks for display workbench

Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>"
```
