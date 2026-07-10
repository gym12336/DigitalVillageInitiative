# AI 村落概况设计文档

- 日期：2026-07-09
- 落地：在联网搜索结果顶部新增"AI 村落概况"卡片，通过博查 AI Search API 生成目标村的概况总结，帮助用户快速了解村情
- 关联：[联网搜索增强方案生成设计文档](./2026-07-08-web-search-enhancement-design.md)

---

## 0. 目标与动机

### 问题

当前联网搜索返回的是网页卡片列表（标题 + 摘要 + 链接），用户需要逐一点击链接才能了解目标村的基本信息。网页搜索不能直接回答"这个村是什么情况"。

### 目标

新增一个"村落概况"维度，通过博查 AI Search API（`/v1/ai-search`）让大模型直接总结目标村的地理位置、人口、产业、文化等信息，以独立卡片形式展示在所有搜索结果最上方。

### 成功标准

- 联网搜索触发时，同步调用 AI Search 获取村落概况
- 概况以独立卡片形式置顶展示，样式与网页卡片区分
- AI Search 失败/超时不阻塞主流程，静默跳过
- 概况卡片不参与"采纳"（它是 AI 总结，不是原始资料来源）
- 全量 `vitest run` 不回归

---

## 1. 整体流程

```
maybeSearchWeb()
  ├─ searchWeb(village, idea)              → POST /api/search/web
  │   ├─ 4 个维度 Web Search              → 网页卡片
  │   └─ 1 个维度 AI Search（新增）       → 村落概况
  │
  └─ 合并：
       概况卡片（置顶，一条）
       网页卡片（随后，多条）
```

---

## 2. 后端

### 2.1 `server/lib/webSearch.js` — 新增 `searchBochaAI()`

```
输入：query: string, apiKey?: string, fetchImpl?: Function
输出：Promise<{ answer: string, references: Array<{ title, url, snippet }> }>

调用：POST https://api.bochaai.com/v1/ai-search
Body：{ query, answer: true, count: 5 }
Headers：Authorization: Bearer <key>, Content-Type: application/json
超时：15s（AI 比 Web Search 慢，需要更长的超时）
无 key / 超时 / 失败 → 返回 { answer: '', references: [] }
```

AI Search 响应格式：

```json
{
  "code": 200,
  "messages": [
    { "role": "assistant", "type": "source", "content_type": "webpage",
      "content": "{\"value\":[{\"name\":\"...\",\"url\":\"...\",\"snippet\":\"...\"}]}" },
    { "role": "assistant", "type": "answer", "content_type": "text",
      "content": "陈家铺村位于浙江省松阳县……" }
  ]
}
```

解析逻辑：
- 遍历 `messages[]`，找 `type === "answer"` 的 message，提取 `content` 作为 answer
- 找 `type === "source"` 且 `content_type === "webpage"` 的 message，JSON.parse 其 `content`，提取 `value[]` 中的 `{ name, url, snippet }` 作为 references
- 无 cache（AI 总结每次可能不同，且搜索词包含具体村名，重复调用概率低）
- 无 in-flight dedup（原因同上）

### 2.2 `server/services/searchService.js` — 新增 `villageOverview` 维度

新增维度：

| 维度 key | 搜索词模板 | 取结果 |
|----------|-----------|--------|
| `villageOverview` | `{village} 基本概况 地理位置 人口 产业 文化特色` | 1 条 answer |

仅当 `village` 非空时才跑此维度。

`searchVillage()` 返回结构变更：

```js
// 原来
{ results: [...] }

// 改为
{ results: [...], overview: { answer: string, references: [...] } | null }
```

五个维度（4 个 Web + 1 个 AI）并发执行。AI Search 维度失败返回 `null`，不影响其他维度。

### 2.3 `server/routes/search.js` — 响应新增 `overview`

```
POST /api/search/web
返回：{ results: [...], overview: { answer, references } | null }
```

---

## 3. 前端

### 3.1 `retrieval.js` — `searchWeb()` 返回值变更

```js
// 原来
export async function searchWeb(village, idea) {
  const results = await apiSearchWeb({ village, idea })
  return results.map(r => ({ source: 'web', ... }))
}

// 改为
export async function searchWeb(village, idea) {
  const data = await apiSearchWeb({ village, idea })
  const cards = (data.results || []).map(r => ({ source: 'web', ... }))
  const overview = data.overview || null
  return { cards, overview }
}
```

### 3.2 `api.js` — `apiSearchWeb()` 透传完整响应

```js
// 原来返回 results 数组
return (data && data.results) || []

// 改为返回完整对象 { results, overview }
return data || { results: [], overview: null }
```

### 3.3 `StagePlan.vue` — 渲染概况卡片

在 `maybeSearchWeb()` 中，拿到 `{ cards, overview }` 后：

```
1. overview 存为 ref：overviewData
2. 网页卡片照旧合并到 cards
```

模板新增概况卡片（置顶，在 `ret-grid` 上方）：

```html
<article v-if="overviewData" class="overview-card">
  <span class="ret-source src-ai">🤖 AI 村落概况</span>
  <div class="overview-body">{{ overviewData.answer }}</div>
  <details v-if="overviewData.references.length" class="overview-refs">
    <summary>参考来源（{{ overviewData.references.length }}）</summary>
    <ul>
      <li v-for="r in overviewData.references" :key="r.url">
        <a :href="r.url" target="_blank">{{ r.title }}</a>
      </li>
    </ul>
  </details>
</article>
```

概况卡片不显示"查看"/"采纳"按钮——它是 AI 总结，不是一手资料。

---

## 4. 测试

### 4.1 `server-webSearch.test.js` — 新增 `searchBochaAI` 测试

- 正常响应 → 解析 answer + references
- HTTP 非 ok → 返回 `{ answer: '', references: [] }`
- 无 key → 返回空
- 超时 → 返回空
- messages 中无 answer 类型 → 返回空 answer

### 4.2 `server-searchService.test.js` — 新增 villageOverview 维度测试

- AI Search 正常 → `overview` 非 null
- AI Search 失败 → `overview` 为 null，results 不受影响
- village 为空 → 不触发 AI Search 维度

### 4.3 前端测试

- `mine-retrieval-web.test.js`：`searchWeb()` 返回 `{ cards, overview }` 结构
- `mine-stagePlan-web.test.js`：概况卡片渲染、来源折叠展开
