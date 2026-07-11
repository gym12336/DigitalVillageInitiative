# 「实践前」自动检索 + 概要加权 Implementation Plan

- 作者：gym

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `retrieve` 接受可选的 topic/village 加权，并让 StagePlan 进入「实践前」时按条件自动检索一次。

**Architecture:** 纯前端。`retrieval.js` 扩展第三参数（向后兼容），把 topic 关键词与 idea 合并去重参与打分、village 做显式精确加权。`StagePlan.vue` 在 onSearch 里带上概要，并新增 maybeAutoSearch 在挂载与切换档案时触发。

**Tech Stack:** Vue 3 (script setup), Vitest, Vite。

## Global Constraints

- 纯前端，无后端；检索为规则版纯函数。
- `retrieve` 向后兼容：不传 topic/village 时结果与现有三参调用完全一致。
- 只测纯函数；视图逻辑不加组件测试（项目惯例）。
- 权重常量 `TITLE_WEIGHT=3 / SUB_WEIGHT=1 / TAG_WEIGHT=2 / VILLAGE_EXACT=4` 不变。
- 全量 `npx vitest run` 不回归；`npx vite build` 通过。
- 提交信息结尾附：`Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: retrieval.js 支持 topic/village 加权

**Files:**
- Modify: `src/modules/practice/mine/retrieval.js`（`villageNameHit` 约 71-78 行；`retrieve` 签名 84 行、`extractKeywords(idea)` 85 行、三处 `villageNameHit(..., idea)` 98/117/137 行）
- Test: `src/__tests__/mine-retrieval.test.js`

**Interfaces:**
- Produces: `retrieve(idea, sources, { perSource = 4, topic = '', village = '' } = )` — 返回卡片数组 `{ source, id, title, sub, path, score }`，行为在不传 topic/village 时与旧签名一致。

- [ ] **Step 1: 写失败测试**

在 `src/__tests__/mine-retrieval.test.js` 的 `describe('retrieve', ...)` 内追加：

```js
  it('topic 参与打分：无关 idea + 文化主题命中文化类来源', () => {
    const cards = retrieve('今天天气不错', sources, { topic: '文化挖掘' })
    const bySource = new Set(cards.map((c) => c.source))
    expect(cards.length).toBeGreaterThan(0)
    expect(bySource.has('result') || bySource.has('demand') || bySource.has('village')).toBe(true)
  })

  it('village 显式精确加权：目标村置顶其来源', () => {
    const cards = retrieve('生态旅游', sources, { village: '扎尕那村' })
    const firstVillage = cards.find((c) => c.source === 'village')
    expect(firstVillage.title).toBe('扎尕那村')
  })

  it('不传 topic/village 时与旧签名结果一致（向后兼容）', () => {
    const a = retrieve('陈家铺村竹编', sources)
    const b = retrieve('陈家铺村竹编', sources, {})
    expect(b).toEqual(a)
  })

  it('idea 空但 topic 非空也能出结果', () => {
    const cards = retrieve('', sources, { topic: '竹编' })
    expect(cards.length).toBeGreaterThan(0)
  })
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/__tests__/mine-retrieval.test.js`
Expected: 新增 4 条中，`topic 参与打分`、`village 显式精确加权`、`idea 空但 topic 非空` FAIL（旧代码忽略第三参 topic/village）；`向后兼容` PASS。

- [ ] **Step 3: 改 villageNameHit 接受显式 village**

将 `src/modules/practice/mine/retrieval.js` 现有：

```js
// 村庄名精确命中：任一关键词等于村名，或村名（去掉「村」后缀）出现在 idea 里。
function villageNameHit(name, keywords, idea) {
  if (!name) return false
  const lower = name.toLowerCase()
  const bare = lower.replace(/村$/, '')
  const ideaLower = String(idea || '').toLowerCase()
  if (ideaLower.includes(lower) || (bare && ideaLower.includes(bare))) return true
  return keywords.some((kw) => kw === lower || kw === bare)
}
```

替换为（第三参改为「文本 + 显式目标村」两路精确匹配）：

```js
// 村庄名精确命中：任一关键词等于村名，或村名（去掉「村」后缀）出现在 idea 文本 / 显式目标村里。
function villageNameHit(name, keywords, ideaText, targetVillage = '') {
  if (!name) return false
  const lower = name.toLowerCase()
  const bare = lower.replace(/村$/, '')
  const ideaLower = String(ideaText || '').toLowerCase()
  const targetLower = String(targetVillage || '').toLowerCase()
  if (ideaLower.includes(lower) || (bare && ideaLower.includes(bare))) return true
  if (targetLower && (targetLower === lower || targetLower === bare)) return true
  return keywords.some((kw) => kw === lower || kw === bare)
}
```

- [ ] **Step 4: 改 retrieve 签名与关键词合并**

将现有：

```js
export function retrieve(idea, sources = {}, { perSource = 4 } = {}) {
  const keywords = extractKeywords(idea)
  if (!keywords.length) return []
```

替换为（合并 idea 与 topic 关键词去重）：

```js
export function retrieve(idea, sources = {}, { perSource = 4, topic = '', village = '' } = {}) {
  const keywords = [...new Set([...extractKeywords(idea), ...extractKeywords(topic)])]
  if (!keywords.length) return []
```

- [ ] **Step 5: 三处 villageNameHit 调用传入显式 village**

在同文件把三处调用（village 循环、result 循环、demand 循环内）：

```js
if (villageNameHit(v.name, keywords, idea)) score += VILLAGE_EXACT
```
```js
if (villageNameHit(r.village, keywords, idea)) score += VILLAGE_EXACT
```
```js
if (villageNameHit(d.village, keywords, idea)) score += VILLAGE_EXACT
```

分别改为追加第四参 `village`：

```js
if (villageNameHit(v.name, keywords, idea, village)) score += VILLAGE_EXACT
```
```js
if (villageNameHit(r.village, keywords, idea, village)) score += VILLAGE_EXACT
```
```js
if (villageNameHit(d.village, keywords, idea, village)) score += VILLAGE_EXACT
```

- [ ] **Step 6: 运行测试确认通过**

Run: `npx vitest run src/__tests__/mine-retrieval.test.js`
Expected: PASS（含新增 4 条与原有全部）。

- [ ] **Step 7: 提交**

```bash
git add src/modules/practice/mine/retrieval.js src/__tests__/mine-retrieval.test.js
git commit -m "feat(mine): retrieve 支持 topic 合并关键词与 village 显式加权

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: StagePlan 进入实践前自动检索并带上概要

**Files:**
- Modify: `src/modules/practice/mine/StagePlan.vue`（`onSearch` 约 128-134 行；`watch(() => props.dossier.id, ...)` 约 116-124 行；`<script setup>` 需引入 `onMounted`）

**Interfaces:**
- Consumes: `retrieve(idea, sources, { topic, village })`（Task 1）。

- [ ] **Step 1: 引入 onMounted**

打开 `src/modules/practice/mine/StagePlan.vue`，把首行 Vue 导入：

```js
import { ref, reactive, computed, watch } from 'vue'
```

改为：

```js
import { ref, reactive, computed, watch, onMounted } from 'vue'
```

- [ ] **Step 2: onSearch 带上 topic/village**

将现有：

```js
function onSearch() {
  const idea = ideaInput.value.trim()
  cards.value = retrieve(idea, retrievalSources)
  searched.value = true
  // idea 变更即写回档案
  emit('update', { idea })
}
```

替换为：

```js
function onSearch() {
  const idea = ideaInput.value.trim()
  cards.value = retrieve(idea, retrievalSources, {
    topic: props.dossier.plan?.topic,
    village: props.dossier.village,
  })
  searched.value = true
  // idea 变更即写回档案（自动检索时 idea 未变，写回幂等，无副作用）
  emit('update', { idea })
}

// 进入实践前：refs 为空（从未采纳过资源）且 idea 或 topic 非空时，自动检索一次。
function maybeAutoSearch() {
  const hasRefs = (props.dossier.refs || []).length > 0
  const hasSeed = !!(ideaInput.value.trim() || props.dossier.plan?.topic)
  if (!hasRefs && hasSeed) onSearch()
}
```

- [ ] **Step 3: 挂载与切换档案时触发自动检索**

将现有 watch：

```js
// 切换档案时，同步本地状态
watch(
  () => props.dossier.id,
  () => {
    ideaInput.value = props.dossier.idea || ''
    Object.assign(plan, props.dossier.plan)
    searched.value = false
    cards.value = []
  },
)
```

替换为（同步后调用 maybeAutoSearch），并在其后新增 onMounted：

```js
// 切换档案时，同步本地状态并按条件自动检索
watch(
  () => props.dossier.id,
  () => {
    ideaInput.value = props.dossier.idea || ''
    Object.assign(plan, props.dossier.plan)
    searched.value = false
    cards.value = []
    maybeAutoSearch()
  },
)

// 首次进入实践前也按条件自动检索
onMounted(maybeAutoSearch)
```

注：`maybeAutoSearch` 定义在 `onSearch`（Step 2）中，位于 watch 之后；因是函数声明会被提升，watch 回调运行时可正常调用。

- [ ] **Step 4: 运行全量测试确认不回归**

Run: `npx vitest run`
Expected: PASS（全部，含 Task 1 新增；无回归）。

- [ ] **Step 5: 构建确认通过**

Run: `npx vite build`
Expected: `✓ built`（chunk 体积警告为既有，无关）。

- [ ] **Step 6: 提交**

```bash
git add src/modules/practice/mine/StagePlan.vue
git commit -m "feat(mine): 进入实践前按条件自动检索并带上主题/目标村

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage:**
- §2 改动一（topic 合并关键词）→ Task 1 Step 4。
- §2 改动二（village 显式加权）→ Task 1 Step 3+5。
- §2 改动三（空 idea + topic 出结果）→ Task 1 Step 1 第 4 条测试。
- §3 onSearch 带概要 → Task 2 Step 2。
- §3 maybeAutoSearch + onMounted + watch → Task 2 Step 2/3。
- §5 测试四组（topic/village/向后兼容/空 idea）→ Task 1 Step 1。
- §4 边界（topic/village undefined 兜底）→ `extractKeywords(String(...))` 与 `String(targetVillage||'')` 已覆盖。

**Placeholder scan:** 无 TBD/TODO；每个代码步骤含完整前后代码。

**Type consistency:** `villageNameHit(name, keywords, ideaText, targetVillage)` 四参在定义（Step 3）与三处调用（Step 5）一致；`retrieve` 选项 `{ perSource, topic, village }` 在 Task 1 定义、Task 2 使用一致。
