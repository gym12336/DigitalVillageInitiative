# 乡村实践页（期一）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `乡村实践` 栏目从 PageScaffold 占位建成完整内容页：头条轮播 + 页面头部 + 实践概况 + 乡村人物 + 乡土视频 + 成果列表，沿用乡村之声（voice）模块的交互与样式。

**Architecture:** 单页组件 `PracticeView.vue`（同 VoiceView 的单文件做法），数据集中在 `practice-data.json`，筛选/排序抽为纯函数 `practice-filters.js` 便于单测。Toast 从 voice 抽为共享组件 `AppToast.vue`，voice 与 practice 共用。详情页留到期二，本期点成果卡只 Toast。

**Tech Stack:** Vue 3 `<script setup>`、Vite、Vitest + @vue/test-utils。复用 `CountUp.vue`、`theme.css` 暖绿变量。

参考 spec：`docs/superpowers/specs/2026-07-05-practice-page-phase1-design.md`

---

## 文件结构

- 新增 `src/components/AppToast.vue` — 共享 Toast（从 `voice/VoiceToast.vue` 抽出，逻辑不变）。
- 修改 `src/modules/voice/VoiceView.vue` — 引用改为 `@/components/AppToast.vue`。
- 删除 `src/modules/voice/VoiceToast.vue` — 被共享组件取代。
- 新增 `src/modules/practice/practice-data.json` — 全部数据：头条 3 / 概况 4 / 动态文案 3 / 人物 8 / 视频 4 / 成果 12。
- 新增 `src/modules/practice/practice-filters.js` — 纯函数 `filterPeople` / `filterResults` / `sortResults`。
- 替换 `src/modules/practice/PracticeView.vue` — 页面主体（6 模块 + 人物弹窗 + 视频弹窗，内联）。
- 新增 `src/__tests__/practice-filters.test.js` — 纯函数单测。
- 新增 `src/__tests__/PracticeView.test.js` — 挂载冒烟测试。
- 新增 `src/__tests__/AppToast.test.js` — Toast 显示/自动消失测试。

`src/modules/practice/routes.js` 无需改动（已导出 `/practice → PracticeView`）。

约定：命令用 `npx vitest run <文件>` 单跑；全量回归用 `npm test`。基线 43 测试须全过。

---

## Task 1: 抽出共享 AppToast 组件

**Files:**
- Create: `src/components/AppToast.vue`
- Create: `src/__tests__/AppToast.test.js`
- Modify: `src/modules/voice/VoiceView.vue`
- Delete: `src/modules/voice/VoiceToast.vue`

- [ ] **Step 1: 新建 `src/components/AppToast.vue`**（内容与 VoiceToast 相同，类名改 `app-toast`）

```vue
<template>
  <!-- 全站共享的轻量 Toast，不依赖全局。通过 ref 暴露 show() 调用 -->
  <Teleport to="body">
    <transition name="app-toast">
      <div v-if="visible" class="app-toast" role="status" aria-live="polite">
        {{ message }}
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref } from 'vue'

const message = ref('')
const visible = ref(false)
let timer = null

function show(text, duration = 2400) {
  message.value = text
  visible.value = true
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    visible.value = false
  }, duration)
}

defineExpose({ show })
</script>

<style scoped>
.app-toast {
  position: fixed;
  left: 50%;
  bottom: 12%;
  transform: translateX(-50%);
  z-index: 3000;
  max-width: min(88vw, 420px);
  padding: 0.85rem 1.4rem;
  border-radius: 50px;
  background: var(--color-primary-dark);
  color: #fff;
  font-size: 0.95rem;
  text-align: center;
  box-shadow: 0 8px 30px rgba(77, 107, 62, 0.35);
}
.app-toast-enter-active,
.app-toast-leave-active {
  transition: opacity var(--transition), transform var(--transition);
}
.app-toast-enter-from,
.app-toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 12px);
}
</style>
```

- [ ] **Step 2: 写 AppToast 测试** `src/__tests__/AppToast.test.js`

```js
import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AppToast from '@/components/AppToast.vue'

describe('AppToast 共享提示', () => {
  it('show() 后显示文本，到期后自动隐藏', async () => {
    vi.useFakeTimers()
    const w = mount(AppToast, { attachTo: document.body })
    w.vm.show('已保存', 1000)
    await w.vm.$nextTick()
    expect(document.body.textContent).toContain('已保存')
    vi.advanceTimersByTime(1000)
    await w.vm.$nextTick()
    expect(w.vm.visible ?? false).toBeFalsy()
    vi.useRealTimers()
    w.unmount()
  })
})
```

- [ ] **Step 3: 跑测试确认通过**

Run: `npx vitest run src/__tests__/AppToast.test.js`
Expected: PASS（1 test）

- [ ] **Step 4: 改 VoiceView 引用共享组件**

在 `src/modules/voice/VoiceView.vue` 中：
- 模板里 `<VoiceToast ref="toastRef" />` 改为 `<AppToast ref="toastRef" />`
- script 里 `import VoiceToast from './VoiceToast.vue'` 改为 `import AppToast from '@/components/AppToast.vue'`

- [ ] **Step 5: 删除旧文件**

```bash
rm src/modules/voice/VoiceToast.vue
```

- [ ] **Step 6: 全量回归，确认 voice 相关测试与基线不回归**

Run: `npm test`
Expected: PASS，测试数 = 43 + 1(AppToast) = 44

- [ ] **Step 7: Commit**

```bash
git add src/components/AppToast.vue src/__tests__/AppToast.test.js src/modules/voice/VoiceView.vue
git add -u src/modules/voice/VoiceToast.vue
git commit -m "refactor: 抽出共享 AppToast，voice 改引用"
```

---

## Task 2: 建数据文件 `practice-data.json`

**Files:**
- Create: `src/modules/practice/practice-data.json`

全部内容取自《一、设计风格与配色.md》第五节真实名字，图片用 Unsplash 占位（`https://images.unsplash.com/...&w=800&q=60` 形式，实现时可换任意乡村/竹编/古建题材图，占位即可）。人物 `story` 为 600 字以上叙事性采访全文（非问答体），陈大爷用文档给定的《竹编、老人与一座村庄的新生》，其余 7 人各原创一段真实向叙事。

- [ ] **Step 1: 写 `highlights` / `overview` / `rotatingTexts`**

```json
{
  "highlights": [
    { "id": "h1", "resultId": "r1", "title": "陈家铺村非遗竹编传承与产业化调研", "school": "浙江大学", "village": "陈家铺村", "province": "浙江", "oneLine": "五十四年的手艺，等来了愿意学的年轻人", "tag": "文化挖掘", "cover": "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=60" },
    { "id": "h2", "resultId": "r2", "title": "宏村古建筑群保护与活化利用研究", "school": "东南大学", "village": "宏村", "province": "安徽", "oneLine": "让八百年的马头墙，走进当代生活", "tag": "乡村规划", "cover": "https://images.unsplash.com/photo-1599422314077-f4dfdaa4cf35?w=800&q=60" },
    { "id": "h3", "resultId": "r3", "title": "扎尕那村生态旅游可持续发展路径探析", "school": "兰州大学", "village": "扎尕那村", "province": "甘肃", "oneLine": "在石匣子里，寻找发展与守护的平衡", "tag": "乡村规划", "cover": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=60" }
  ],
  "overview": { "days": 1286, "teams": 267, "villagers": 12458, "demands": 89 },
  "rotatingTexts": [
    "此刻，浙江大学实践团正在陈家铺村记录第 37 位竹编手艺人的口述史。",
    "过去一周，新增 12 份实践成果，覆盖 8 个省份的乡村。",
    "已有 267 支高校团队，把论文写在了祖国的大地上。"
  ],
```

- [ ] **Step 2: 写 `people`（8 人，含采访全文）** — 接在上面 JSON 的同一对象内，键为 `"people"`。

每个人物对象字段：`{ id, name, role, village, avatarColor, tags[], oneLine, story }`。`avatarColor` 用主题麦色系（如 `"#c9a86a"`），头像取 `name` 首字。`oneLine` 用文档给的一句话故事。`story` 为 600 字以上叙事全文。

人物 1（陈大爷）`story` 直接用文档《竹编、老人与一座村庄的新生》原文（上面已读取，实现时整段粘入，段落用 `\n\n` 分隔）。

```json
  "people": [
    {
      "id": "p1", "name": "陈大爷", "role": "非遗竹编传承人", "village": "陈家铺村",
      "avatarColor": "#c9a86a", "tags": ["非遗传承人", "竹编", "老村民"],
      "oneLine": "做了54年竹编，终于等来了愿意学的年轻人",
      "story": "标题：竹编、老人与一座村庄的新生\n\n2026年7月，我们在陈家铺村见到了陈大爷……（此处粘入文档 273–293 行采访全文，段落以 \\n\\n 分隔）"
    },
```

其余 7 人（p2–p8）按下表写，每人 `story` 原创 600 字以上、叙事体、含环境描写 + 人物细节 + 故事主线 + 情感，口径与文档一致：

| id | name | role | village | tags | oneLine |
|----|------|------|---------|------|---------|
| p2 | 李阿姨 | 竹编工坊负责人 | 陈家铺村 | 手工艺人 / 致富带头人 | 从家庭作坊到品牌工坊，竹编有了新生命 |
| p3 | 王村长 | 村委会主任 | 陈家铺村 | 村干部 / 乡村治理 | 大学生来了，村子活起来了 |
| p4 | 吴老师 | 古建筑守护人 | 西递村 | 建筑修缮 / 老村民 | 守护西递30年，每一块砖瓦都有故事 |
| p5 | 扎西大叔 | 生态护林员 | 扎尕那村 | 生态守护者 / 老村民 | 这片森林我守了20年，现在更多人一起守 |
| p6 | 赵师傅 | 木雕手艺人 | 宏村 | 木雕 / 手工艺人 | 徽派木雕，一刀一刻都是传承 |
| p7 | 小杨 | 返乡创业青年 | 龙潭村 | 返乡青年 / 文创 | 从城市回到乡村，开了一家理想中的书店 |
| p8 | 刘老师 | 乡村教师 | 十八洞村 | 乡村教师 / 教育 | 在乡村小学教书15年，看着一批批孩子长大 |

> 采访全文由实现者按人物设定原创撰写，不得复用陈大爷示例。每段 600 字以上，`\n\n` 分段。筛选用的标签集合（含身份）须落在人物 `tags` 内，保证 `filterPeople` 能命中。

- [ ] **Step 3: 写 `videos`（4 个）**

```json
  "videos": [
    { "id": "v1", "title": "陈家铺村·竹编记忆", "team": "浙江大学实践团", "duration": "15:32", "cover": "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=60" },
    { "id": "v2", "title": "西递·时光的守望", "team": "东南大学实践团", "duration": "12:18", "cover": "https://images.unsplash.com/photo-1599422314077-f4dfdaa4cf35?w=800&q=60" },
    { "id": "v3", "title": "扎尕那·云端人家", "team": "兰州大学实践团", "duration": "18:45", "cover": "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=60" },
    { "id": "v4", "title": "篁岭·晒秋的颜色", "team": "江西师范大学实践团", "duration": "08:20", "cover": "https://images.unsplash.com/photo-1508767019741-5a0e5f9f7e08?w=800&q=60" }
  ],
```

- [ ] **Step 4: 写 `results`（12 个）**

字段 `{ id, title, school, team, village, province, type, form, year, cert, views, likes, downloads, cover }`。`school` / `title` / `year` 用文档 234–245 行原值。`type` 从 `[产业调研|文化挖掘|教育帮扶|乡村规划|科技助农|健康帮扶|数字赋能]` 中按题材择一；`form` 从 `[调研报告|影像记录|设计方案|文创产品|数据可视化|口述史]` 择一。`cert` 恒为 `"学院团委推荐"`。`views/likes/downloads` 给合理随机整数（views 数千、likes 数百、downloads 数十至数百），且各排序键要有区分度以便单测。`team` 用「<校名>三下乡实践团」。`province` 按村所在省。前 3 个 id = r1/r2/r3，对应 highlights 的 resultId。

```json
  "results": [
    { "id": "r1", "title": "陈家铺村非遗竹编传承与产业化调研", "school": "浙江大学", "team": "浙江大学三下乡实践团", "village": "陈家铺村", "province": "浙江", "type": "文化挖掘", "form": "调研报告", "year": 2026, "cert": "学院团委推荐", "views": 5820, "likes": 642, "downloads": 318, "cover": "https://images.unsplash.com/photo-1528181304800-259b08848526?w=800&q=60" },
    { "id": "r2", "title": "宏村古建筑群保护与活化利用研究", "school": "东南大学", "team": "东南大学三下乡实践团", "village": "宏村", "province": "安徽", "type": "乡村规划", "form": "设计方案", "year": 2025, "cert": "学院团委推荐", "views": 4310, "likes": 401, "downloads": 205, "cover": "https://images.unsplash.com/photo-1599422314077-f4dfdaa4cf35?w=800&q=60" }
    // r3–r12 同结构：扎尕那(兰州大学,2026,乡村规划) / 肇兴侗寨(贵州大学,2025,文化挖掘,影像记录) /
    // 篁岭(江西师范大学,2026,文化挖掘,文创产品) / 丹巴藏寨(四川大学,2024,文化挖掘,调研报告) /
    // 龙潭村(中国美术学院,2026,乡村规划,设计方案) / 西递(南京大学,2025,乡村规划,调研报告) /
    // 禾木村(新疆大学,2026,乡村规划,数据可视化) / 周庄(河海大学,2025,科技助农,数据可视化) /
    // 银杏村(北京林业大学,2026,产业调研,调研报告) / 大寨村(山西大学,2024,教育帮扶,口述史)
  ]
}
```

- [ ] **Step 5: 校验 JSON 合法**

Run: `node -e "require('./src/modules/practice/practice-data.json') && console.log('ok')"`
Expected: 打印 `ok`（无语法错误）。注意正式 JSON 不能留注释，上面 `//` 仅为计划示意，写文件时删除。

---

## Task 3: 抽纯函数 `practice-filters.js` + 单测

**Files:**
- Create: `src/modules/practice/practice-filters.js`
- Create: `src/__tests__/practice-filters.test.js`

- [ ] **Step 1: 写 `src/modules/practice/practice-filters.js`**

纯函数，不依赖 Vue，输入输出确定，返回新数组不改入参。

```js
// 乡村实践页的筛选/排序纯函数，与视图解耦便于单测。

/** 按标签过滤人物；tag 为「全部」返回全部。匹配 role 或 tags 数组任一。 */
export function filterPeople(people, tag) {
  if (!tag || tag === '全部') return [...people]
  return people.filter((p) => p.role === tag || (p.tags || []).includes(tag))
}

/** 多条件过滤成果：keyword（标题/学校/团队/村，大小写不敏感）、type、form、year。'全部'/空表示不限。 */
export function filterResults(results, { keyword = '', type = '全部', form = '全部', year = '全部' } = {}) {
  const kw = String(keyword).trim().toLowerCase()
  return results.filter((r) => {
    if (type !== '全部' && r.type !== type) return false
    if (form !== '全部' && r.form !== form) return false
    if (year !== '全部' && String(r.year) !== String(year)) return false
    if (kw) {
      const hay = [r.title, r.school, r.team, r.village].join(' ').toLowerCase()
      if (!hay.includes(kw)) return false
    }
    return true
  })
}

/** 四种排序，返回新数组：latest(年份降序) / views / likes / downloads(均降序)。 */
export function sortResults(results, sortBy = 'latest') {
  const list = [...results]
  const byNum = (key) => (a, b) => (b[key] ?? 0) - (a[key] ?? 0)
  if (sortBy === 'views') return list.sort(byNum('views'))
  if (sortBy === 'likes') return list.sort(byNum('likes'))
  if (sortBy === 'downloads') return list.sort(byNum('downloads'))
  return list.sort(byNum('year')) // latest
}
```

- [ ] **Step 2: 写 `src/__tests__/practice-filters.test.js`**

用内联小样本夹具（不依赖真实数据文件，稳定），覆盖：人物标签过滤、成果多条件过滤、四种排序各一例、清除筛选（全「全部」）后全量、不改入参。

```js
import { describe, it, expect } from 'vitest'
import { filterPeople, filterResults, sortResults } from '@/modules/practice/practice-filters'

const people = [
  { id: 'a', name: '陈大爷', role: '非遗竹编传承人', tags: ['非遗传承人', '竹编', '老村民'] },
  { id: 'b', name: '王村长', role: '村委会主任', tags: ['村干部', '乡村治理'] },
  { id: 'c', name: '刘老师', role: '乡村教师', tags: ['乡村教师', '教育'] },
]
const results = [
  { id: 'r1', title: '竹编调研', school: '浙江大学', team: '浙大团', village: '陈家铺村', type: '文化挖掘', form: '调研报告', year: 2026, views: 100, likes: 10, downloads: 5 },
  { id: 'r2', title: '古建研究', school: '东南大学', team: '东大团', village: '宏村', type: '乡村规划', form: '设计方案', year: 2025, views: 300, likes: 5, downloads: 50 },
  { id: 'r3', title: '生态旅游', school: '兰州大学', team: '兰大团', village: '扎尕那村', type: '乡村规划', form: '数据可视化', year: 2024, views: 200, likes: 30, downloads: 20 },
]

describe('filterPeople', () => {
  it('全部返回全体', () => expect(filterPeople(people, '全部')).toHaveLength(3))
  it('按标签命中（tags 或 role）', () => {
    expect(filterPeople(people, '竹编').map((p) => p.id)).toEqual(['a'])
    expect(filterPeople(people, '乡村教师').map((p) => p.id)).toEqual(['c'])
  })
  it('不改入参', () => { const c = [...people]; filterPeople(people, '竹编'); expect(people).toEqual(c) })
})

describe('filterResults', () => {
  it('清除筛选（全部）返回全量', () => expect(filterResults(results, {})).toHaveLength(3))
  it('按类型过滤', () => expect(filterResults(results, { type: '乡村规划' }).map((r) => r.id)).toEqual(['r2', 'r3']))
  it('按形式过滤', () => expect(filterResults(results, { form: '调研报告' }).map((r) => r.id)).toEqual(['r1']))
  it('按年份过滤（数字/字符串皆可）', () => expect(filterResults(results, { year: 2026 }).map((r) => r.id)).toEqual(['r1']))
  it('关键词匹配学校/村，大小写不敏感', () => {
    expect(filterResults(results, { keyword: '浙江大学' }).map((r) => r.id)).toEqual(['r1'])
    expect(filterResults(results, { keyword: '宏村' }).map((r) => r.id)).toEqual(['r2'])
  })
  it('多条件叠加', () => expect(filterResults(results, { type: '乡村规划', form: '数据可视化' }).map((r) => r.id)).toEqual(['r3']))
})

describe('sortResults', () => {
  it('latest 按年份降序', () => expect(sortResults(results, 'latest').map((r) => r.year)).toEqual([2026, 2025, 2024]))
  it('views 降序', () => expect(sortResults(results, 'views').map((r) => r.id)).toEqual(['r2', 'r3', 'r1']))
  it('likes 降序', () => expect(sortResults(results, 'likes').map((r) => r.id)).toEqual(['r3', 'r1', 'r2']))
  it('downloads 降序', () => expect(sortResults(results, 'downloads').map((r) => r.id)).toEqual(['r2', 'r3', 'r1']))
  it('不改入参', () => { const c = [...results]; sortResults(results, 'views'); expect(results).toEqual(c) })
})
```

- [ ] **Step 3: 跑单测**

Run: `npx vitest run src/__tests__/practice-filters.test.js`
Expected: PASS（全部用例通过）。

- [ ] **Step 4: Commit**

```bash
git add src/modules/practice/practice-data.json src/modules/practice/practice-filters.js src/__tests__/practice-filters.test.js
git commit -m "feat(practice): 数据文件 + 筛选排序纯函数与单测"
```

---

## Task 4: 替换 `PracticeView.vue` 页面主体

**Files:**
- Replace: `src/modules/practice/PracticeView.vue`
- Create: `src/__tests__/PracticeView.test.js`

沿用 VoiceView 的结构、类名与 `<style scoped>` 变量约定（`.page-head` / `.search-bar` / `.chips` / `.chip` / `.filters` / `.tag` / `.modal-mask` / `.modal` / `.modal-fade` 直接照搬样式，命名一致以复用观感）。筛选/排序调用 Task 3 的纯函数；计数复用 `CountUp.vue`；Toast 用 Task 1 的 `AppToast`。

页面 6 模块顺序：头条轮播 → 页面头部 → 实践概况 → 乡村人物 → 乡土视频 → 成果列表。两个模态框（人物采访 / 视频）内联，Teleport + `modal-fade` + ESC + 点遮罩关闭。成果卡点击只 `toast('详情页即将上线')`。头条卡点击 `scrollIntoView` 到成果列表锚点。

- [ ] **Step 1: 模板 —— 头条轮播 + 页面头部 + 实践概况**

```vue
<template>
  <section class="practice-page">
    <div class="container">
      <!-- 头条轮播 -->
      <div
        class="hero-carousel"
        @mouseenter="pauseAuto"
        @mouseleave="resumeAuto"
        aria-roledescription="carousel"
      >
        <p class="hero-kicker">🔥 精选成果 · 本周热门</p>
        <div class="hero-stage">
          <button class="hero-arrow left" aria-label="上一张" @click="prevSlide">‹</button>
          <transition :name="slideDir" mode="out-in">
            <article
              :key="activeHighlight.id"
              class="hero-card"
              role="button"
              tabindex="0"
              @click="goResults"
              @keydown.enter="goResults"
            >
              <img class="hero-cover" :src="activeHighlight.cover" :alt="activeHighlight.title" loading="lazy" />
              <div class="hero-body">
                <span class="hero-tag">{{ activeHighlight.tag }}</span>
                <h2 class="hero-title">{{ activeHighlight.title }}</h2>
                <p class="hero-school">{{ activeHighlight.school }}｜{{ activeHighlight.village }}·{{ activeHighlight.province }}</p>
                <p class="hero-oneline">“{{ activeHighlight.oneLine }}”</p>
              </div>
            </article>
          </transition>
          <button class="hero-arrow right" aria-label="下一张" @click="nextSlide">›</button>
        </div>
        <div class="hero-dots">
          <button
            v-for="(h, i) in highlights"
            :key="h.id"
            class="dot"
            :class="{ active: i === slideIndex }"
            :aria-label="`第 ${i + 1} 张`"
            @click="goSlide(i)"
          />
        </div>
      </div>

      <!-- 页面头部 -->
      <header class="page-head">
        <p class="kicker">乡村实践</p>
        <div class="head-row">
          <div class="head-text">
            <h1>乡村实践 —— 用脚步丈量，用实践记录</h1>
            <p class="desc">汇聚全国三下乡团队的完整实践成果，用数据、人物与影像记录乡村的改变。</p>
            <p class="stat">共 423 份成果 ｜ 覆盖 156 个乡村</p>
          </div>
          <button class="btn-publish" @click="onUpload">上传我的成果</button>
        </div>
      </header>

      <!-- 模块一：实践概况 -->
      <section class="overview">
        <div class="ov-grid">
          <div class="ov-card"><span class="ov-num"><CountUp :value="overview.days" /></span><span class="ov-label">总实践天数</span></div>
          <div class="ov-card"><span class="ov-num"><CountUp :value="overview.teams" /></span><span class="ov-label">参与团队</span></div>
          <div class="ov-card"><span class="ov-num"><CountUp :value="overview.villagers" /></span><span class="ov-label">受益村民</span></div>
          <div class="ov-card"><span class="ov-num"><CountUp :value="overview.demands" /></span><span class="ov-label">已完成需求</span></div>
        </div>
        <p class="ov-rotating" aria-live="polite">{{ rotatingText }}</p>
      </section>
```

- [ ] **Step 2: 模板 —— 乡村人物（标签筛选 + 卡片网格）**

```vue
      <!-- 模块二：乡村人物 -->
      <section class="people">
        <h2 class="sec-title">👤 乡村人物 · 实践中的遇见</h2>
        <p class="sec-desc">那些在实践过程中遇到的乡村守护人，听听他们的故事。</p>
        <div class="chips" role="tablist" aria-label="人物标签筛选">
          <button
            v-for="t in peopleTags"
            :key="t"
            class="chip"
            :class="{ active: peopleTag === t }"
            @click="peopleTag = t"
          >{{ t }}</button>
        </div>
        <div class="people-grid">
          <article
            v-for="p in filteredPeople"
            :key="p.id"
            class="person-card"
            role="button"
            tabindex="0"
            @click="openPerson(p)"
            @keydown.enter="openPerson(p)"
          >
            <div class="avatar" :style="{ background: p.avatarColor }">{{ p.name.charAt(0) }}</div>
            <h3 class="person-name">{{ p.name }}</h3>
            <p class="person-role">{{ p.role }}</p>
            <p class="person-village">📍 {{ p.village }}</p>
            <div class="person-tags">
              <span v-for="t in p.tags" :key="t" class="mini-tag">{{ t }}</span>
            </div>
            <p class="person-oneline">“{{ p.oneLine }}”</p>
            <span class="btn-read">阅读采访故事 ›</span>
          </article>
        </div>
        <p v-if="!filteredPeople.length" class="empty">该标签下暂无人物。</p>
      </section>
```

- [ ] **Step 3: 模板 —— 乡土视频**

```vue
      <!-- 模块三：乡土视频 -->
      <section class="videos">
        <h2 class="sec-title">🎬 乡土视频 · 镜头下的乡村</h2>
        <p class="sec-desc">用影像记录乡村的点点滴滴。</p>
        <div class="video-grid">
          <article
            v-for="v in videos"
            :key="v.id"
            class="video-card"
            role="button"
            tabindex="0"
            @click="openVideo(v)"
            @keydown.enter="openVideo(v)"
          >
            <div class="video-cover">
              <img :src="v.cover" :alt="v.title" loading="lazy" />
              <span class="play-badge">▶</span>
              <span class="video-dur">{{ v.duration }}</span>
            </div>
            <h3 class="video-title">{{ v.title }}</h3>
            <p class="video-team">{{ v.team }}</p>
          </article>
        </div>
      </section>
```

- [ ] **Step 4: 模板 —— 成果列表（搜索 + 排序 + 三组标签 + 筛选路径 + 卡片网格 + 锚点）**

```vue
      <!-- 模块四：成果列表 -->
      <section ref="resultsSection" class="results">
        <h2 class="sec-title">📁 实践成果</h2>
        <div class="search-bar">
          <span class="search-ic">🔍</span>
          <input v-model="keyword" type="text" placeholder="搜索成果标题、团队名称、关键词..." aria-label="搜索成果" />
        </div>
        <div class="chips" role="tablist" aria-label="排序方式">
          <button v-for="o in sortOptions" :key="o.value" class="chip" :class="{ active: sortBy === o.value }" @click="sortBy = o.value">{{ o.label }}</button>
        </div>
        <div class="filters">
          <div class="filter-group">
            <span class="filter-label">实践类型</span>
            <div class="tags">
              <button v-for="t in typeOptions" :key="t" class="tag" :class="{ active: typeFilter === t }" @click="typeFilter = t">{{ t }}</button>
            </div>
          </div>
          <div class="filter-group">
            <span class="filter-label">成果形式</span>
            <div class="tags">
              <button v-for="f in formOptions" :key="f" class="tag" :class="{ active: formFilter === f }" @click="formFilter = f">{{ f }}</button>
            </div>
          </div>
          <div class="filter-group">
            <span class="filter-label">年份</span>
            <div class="tags">
              <button v-for="y in yearOptions" :key="y" class="tag" :class="{ active: String(yearFilter) === String(y) }" @click="yearFilter = y">{{ y }}</button>
            </div>
          </div>
        </div>
        <div class="filter-path">
          <span>当前筛选：{{ typeFilter }} · {{ formFilter }} · {{ yearFilter }} · {{ sortLabel }}<template v-if="keyword">· 关键词“{{ keyword }}”</template></span>
          <button v-if="hasActiveFilter" class="btn-clear" @click="clearFilters">清除筛选</button>
        </div>
        <p class="result-count">筛选到 {{ visibleResults.length }} 份成果</p>
        <div v-if="visibleResults.length" class="result-grid">
          <article v-for="r in visibleResults" :key="r.id" class="result-card" role="button" tabindex="0" @click="openResult(r)" @keydown.enter="openResult(r)">
            <div class="result-cover"><img :src="r.cover" :alt="r.title" loading="lazy" /><span class="result-year">{{ r.year }}</span></div>
            <div class="result-body">
              <h3 class="result-title">{{ r.title }}</h3>
              <p class="result-school">{{ r.school }}</p>
              <p class="result-team">{{ r.team }} · 📍{{ r.village }}·{{ r.province }}</p>
              <div class="result-tags"><span class="mini-tag">{{ r.type }}</span><span class="mini-tag">{{ r.form }}</span></div>
              <span class="cert-badge">✓ {{ r.cert }}</span>
              <div class="result-stats"><span>👁 {{ r.views }}</span><span>👍 {{ r.likes }}</span><span>⬇ {{ r.downloads }}</span></div>
            </div>
          </article>
        </div>
        <p v-else class="empty">没有匹配的成果，试试调整筛选或搜索关键词。</p>
      </section>
    </div>
```

- [ ] **Step 5: 模板 —— 人物采访弹窗 + 视频弹窗 + AppToast**

```vue
    <!-- 人物采访弹窗 -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="activePerson" class="modal-mask" @click.self="closePerson">
          <div class="modal" role="dialog" aria-modal="true" :aria-label="activePerson.name">
            <button class="modal-close" aria-label="关闭" @click="closePerson">×</button>
            <div class="modal-person-head">
              <div class="avatar lg" :style="{ background: activePerson.avatarColor }">{{ activePerson.name.charAt(0) }}</div>
              <div>
                <h2 class="modal-title">{{ activePerson.name }}</h2>
                <p class="modal-sub">{{ activePerson.role }}　·　📍 {{ activePerson.village }}</p>
                <div class="person-tags"><span v-for="t in activePerson.tags" :key="t" class="mini-tag">{{ t }}</span></div>
              </div>
            </div>
            <h3 class="modal-h3">采访故事</h3>
            <p v-for="(para, i) in personStoryParas" :key="i" class="modal-desc story-para">{{ para }}</p>
            <div class="modal-actions">
              <div class="modal-counts">
                <button class="count-btn" @click="toggleLike(activePerson)">{{ likedIds.has(activePerson.id) ? '❤️' : '🤍' }} 点赞</button>
                <button class="count-btn" @click="toggleFav(activePerson)">{{ favIds.has(activePerson.id) ? '⭐' : '☆' }} 收藏</button>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- 视频播放弹窗 -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div v-if="activeVideo" class="modal-mask" @click.self="closeVideo">
          <div class="modal" role="dialog" aria-modal="true" :aria-label="activeVideo.title">
            <button class="modal-close" aria-label="关闭" @click="closeVideo">×</button>
            <div class="video-player" :style="{ backgroundImage: `url(${activeVideo.cover})` }">
              <span class="play-badge lg">▶</span>
              <p class="player-hint">视频播放占位（示例数据，暂无真实视频源）</p>
            </div>
            <h2 class="modal-title">{{ activeVideo.title }}</h2>
            <p class="modal-sub">{{ activeVideo.team }}　·　时长 {{ activeVideo.duration }}</p>
          </div>
        </div>
      </transition>
    </Teleport>

    <AppToast ref="toastRef" />
  </section>
</template>
```

- [ ] **Step 6: `<script setup>`**

```vue
<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import CountUp from '@/components/CountUp.vue'
import AppToast from '@/components/AppToast.vue'
import data from './practice-data.json'
import { filterPeople, filterResults, sortResults } from './practice-filters'

// —— 静态数据 ——
const highlights = data.highlights
const overview = data.overview
const videos = data.videos
const people = data.people
const results = data.results

// —— Toast ——
const toastRef = ref(null)
const toast = (t) => toastRef.value?.show(t)

// —— 头条轮播 ——
const slideIndex = ref(0)
const slideDir = ref('slide-next')
const activeHighlight = computed(() => highlights[slideIndex.value])
let autoTimer = null
const reduceMotion = typeof window !== 'undefined'
  && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
function goSlide(i) { slideDir.value = i >= slideIndex.value ? 'slide-next' : 'slide-prev'; slideIndex.value = (i + highlights.length) % highlights.length }
function nextSlide() { slideDir.value = 'slide-next'; slideIndex.value = (slideIndex.value + 1) % highlights.length }
function prevSlide() { slideDir.value = 'slide-prev'; slideIndex.value = (slideIndex.value - 1 + highlights.length) % highlights.length }
function startAuto() { if (reduceMotion) return; stopAuto(); autoTimer = setInterval(nextSlide, 5000) }
function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null } }
const pauseAuto = stopAuto
const resumeAuto = startAuto

// —— 动态文案轮换 ——
const rotatingIndex = ref(0)
const rotatingText = computed(() => data.rotatingTexts[rotatingIndex.value])
let rotTimer = null

// —— 头部/头条动作 ——
const resultsSection = ref(null)
function goResults() { resultsSection.value?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' }) }
function onUpload() { toast('请登录后上传成果') }

// —— 人物筛选 ——
const peopleTags = ['全部', '非遗传承人', '村干部', '乡村教师', '手工艺人', '生态守护者', '致富带头人', '返乡青年', '老村民']
const peopleTag = ref('全部')
const filteredPeople = computed(() => filterPeople(people, peopleTag.value))

// —— 成果筛选/排序 ——
const keyword = ref('')
const sortBy = ref('latest')
const typeFilter = ref('全部')
const formFilter = ref('全部')
const yearFilter = ref('全部')
const sortOptions = [
  { value: 'latest', label: '最新上传' },
  { value: 'views', label: '最热浏览' },
  { value: 'favorites', label: '最多收藏' }, // 注：映射到 likes 排序键，见下
  { value: 'likes', label: '最多点赞' },
]
const typeOptions = ['全部', '产业调研', '文化挖掘', '教育帮扶', '乡村规划', '科技助农', '健康帮扶', '数字赋能']
const formOptions = ['全部', '调研报告', '影像记录', '设计方案', '文创产品', '数据可视化', '口述史']
const yearOptions = ['全部', 2026, 2025, 2024]
const sortLabel = computed(() => sortOptions.find((o) => o.value === sortBy.value)?.label ?? '')
const hasActiveFilter = computed(() =>
  keyword.value || typeFilter.value !== '全部' || formFilter.value !== '全部' || yearFilter.value !== '全部' || sortBy.value !== 'latest')
function clearFilters() { keyword.value = ''; typeFilter.value = '全部'; formFilter.value = '全部'; yearFilter.value = '全部'; sortBy.value = 'latest' }

const visibleResults = computed(() => {
  const filtered = filterResults(results, {
    keyword: keyword.value, type: typeFilter.value, form: formFilter.value, year: yearFilter.value,
  })
  // sortOptions 有「最多收藏」标签但数据无 favorites 字段，这里统一走 likes（点赞≈收藏热度）
  const key = sortBy.value === 'favorites' ? 'likes' : sortBy.value
  return sortResults(filtered, key)
})

// —— 人物弹窗 ——
const activePerson = ref(null)
const likedIds = reactive(new Set())
const favIds = reactive(new Set())
const personStoryParas = computed(() => (activePerson.value?.story ?? '').split('\n\n').filter(Boolean))
function openPerson(p) { activePerson.value = p }
function closePerson() { activePerson.value = null }
function toggleLike(p) { likedIds.has(p.id) ? likedIds.delete(p.id) : likedIds.add(p.id) }
function toggleFav(p) { favIds.has(p.id) ? favIds.delete(p.id) : favIds.add(p.id) }

// —— 视频弹窗 ——
const activeVideo = ref(null)
function openVideo(v) { activeVideo.value = v }
function closeVideo() { activeVideo.value = null }

// —— 成果卡（详情页下期做） ——
function openResult() { toast('详情页即将上线') }

// —— 生命周期 ——
function onKeydown(e) {
  if (e.key !== 'Escape') return
  if (activePerson.value) closePerson()
  else if (activeVideo.value) closeVideo()
}
onMounted(() => {
  startAuto()
  if (!reduceMotion) rotTimer = setInterval(() => { rotatingIndex.value = (rotatingIndex.value + 1) % data.rotatingTexts.length }, 3000)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  stopAuto()
  if (rotTimer) clearInterval(rotTimer)
  window.removeEventListener('keydown', onKeydown)
})
</script>
```

> 排序说明：`sortResults` 支持 `latest/views/likes/downloads`。UI 的「最多收藏」在数据无 `favorites` 字段时映射到 `likes`，避免新增字段；如后续数据加了 `favorites`，把映射去掉并在纯函数补一个 case 即可。

- [ ] **Step 7: `<style scoped>`**

复用主题变量（`theme.css` 的 `--color-*` / `--radius` / `--shadow-card` / `--shadow-card-hover` / `--transition`）。以下类的样式**直接照搬 VoiceView** 保持一致，不重写：`.container`、`.page-head`、`.kicker`、`.head-row`、`.head-text h1`、`.desc`、`.stat`、`.btn-publish`、`.search-bar`、`.chips`、`.chip`、`.filters`、`.filter-group`、`.filter-label`、`.tags`、`.tag`、`.filter-path`、`.btn-clear`、`.result-count`、`.cert-badge`、`.empty`、`.modal-mask`、`.modal`、`.modal-close`、`.modal-title`、`.modal-sub`、`.modal-h3`、`.modal-desc`、`.modal-actions`、`.modal-counts`、`.count-btn`、`.modal-fade-*`。

新增本页专有样式（照主题风格补齐即可）：
- `.practice-page { padding: 2.6rem 0 3rem; }`
- 头条：`.hero-carousel`（相对定位，圆角卡，`--shadow-card`）、`.hero-kicker`（珊瑚橘 kicker）、`.hero-stage`（flex，箭头两侧）、`.hero-card`（grid 封面+文字，`cursor:pointer`，hover 上浮）、`.hero-cover`（16:9，`object-fit:cover`）、`.hero-arrow`（圆形半透明按钮）、`.hero-dots`/`.dot`（圆点，active 用 `--color-primary`）、过渡 `.slide-next-*` / `.slide-prev-*`（横向位移淡入）。
- 概况：`.overview`、`.ov-grid`（4 列 → 移动 2×2）、`.ov-card`、`.ov-num`（`3.2rem/700/--color-primary`）、`.ov-label`（14px/次要色）、`.ov-rotating`（居中，次要色，min-height 防跳动）。
- 通用 section：`.sec-title`（1.5rem/`--color-primary-dark`）、`.sec-desc`（次要色）。
- 人物：`.people-grid`（`repeat(auto-fill, minmax(240px,1fr))`）、`.person-card`（卡片 + hover 上浮，居中）、`.avatar`（圆形 60px，白字，`.lg` 80px 用于弹窗）、`.person-name`/`.person-role`/`.person-village`、`.person-tags`/`.mini-tag`（小胶囊，`--color-accent` 底 `--color-primary-dark` 字）、`.person-oneline`（斜体次要色）、`.btn-read`（珊瑚橘文字）、`.modal-person-head`（flex，头像+信息）、`.story-para`（段间距 `.9rem`，首行不缩进）。
- 视频：`.video-grid`（`minmax(240px,1fr)`）、`.video-card`、`.video-cover`（16:9，相对定位）、`.play-badge`（居中圆形播放钮，`.lg` 用于播放器）、`.video-dur`（右下角时间胶囊）、`.video-title`/`.video-team`、`.video-player`（16:9，`background-size:cover`，居中占位）、`.player-hint`（白字说明）。
- 成果：`.results`、`.result-grid`（`repeat(auto-fill, minmax(280px,1fr))`，桌面约 3 列）、`.result-card`（hover 上浮）、`.result-cover`（16:9）、`.result-year`（角标）、`.result-body`、`.result-title`（18px/600）、`.result-school`（`--color-primary` 显眼）、`.result-team`（次要色）、`.result-tags`、`.result-stats`（flex，小字次要色）。
- 移动端：`.ov-grid` / `.head-row` 用媒体查询降列，`.hero-card` 单列堆叠。
- `@media (prefers-reduced-motion: reduce)`：轮播过渡与 hover 位移可保留（自动播放已在 JS 关）。

- [ ] **Step 8: 写挂载冒烟测试** `src/__tests__/PracticeView.test.js`

真实引入 `practice-data.json`（不 mock），验证渲染与交互：

```js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import PracticeView from '@/modules/practice/PracticeView.vue'

const stubs = { CountUp: { props: ['value'], template: '<span>{{ value }}</span>' }, teleport: true }

describe('PracticeView 冒烟', () => {
  it('渲染标题、人物卡、成果卡', () => {
    const w = mount(PracticeView, { global: { stubs } })
    expect(w.text()).toContain('乡村实践 —— 用脚步丈量，用实践记录')
    expect(w.findAll('.person-card')).toHaveLength(8)
    expect(w.findAll('.result-card')).toHaveLength(12)
    expect(w.findAll('.video-card')).toHaveLength(4)
  })

  it('人物标签筛选生效', async () => {
    const w = mount(PracticeView, { global: { stubs } })
    const chips = w.findAll('.people .chips .chip')
    const tancherChip = chips.find((c) => c.text() === '乡村教师')
    await tancherChip.trigger('click')
    const cards = w.findAll('.person-card')
    expect(cards.length).toBeGreaterThan(0)
    expect(cards.length).toBeLessThan(8)
    expect(w.text()).toContain('刘老师')
  })

  it('点人物卡打开采访弹窗', async () => {
    const w = mount(PracticeView, { attachTo: document.body })
    await w.find('.person-card').trigger('click')
    await w.vm.$nextTick()
    expect(document.body.textContent).toContain('采访故事')
    w.unmount()
  })

  it('点成果卡触发 Toast「详情页即将上线」', async () => {
    const w = mount(PracticeView, { attachTo: document.body })
    await w.find('.result-card').trigger('click')
    await w.vm.$nextTick()
    expect(document.body.textContent).toContain('详情页即将上线')
    w.unmount()
  })
})
```

> 若 `teleport: true` stub 下弹窗内容未进 `document.body`，改用 `attachTo: document.body` 并断言 `w.text()`；两种写法择一跑通即可（voice 测试用的是哪种就跟随哪种，保持一致）。

- [ ] **Step 9: 跑本页测试**

Run: `npx vitest run src/__tests__/PracticeView.test.js`
Expected: PASS（4 用例）。如 teleport 断言失败，按 Step 8 备注切换写法。

- [ ] **Step 10: Commit**

```bash
git add src/modules/practice/PracticeView.vue src/__tests__/PracticeView.test.js
git commit -m "feat(practice): 乡村实践页主体（头条/概况/人物/视频/成果）"
```

---
## Task 5: 全量回归与人工验收

**Files:** 无新增，验证 + 收尾。

- [ ] **Step 1: 全量测试回归**

Run: `npm test`
Expected: 全绿。测试总数 = 基线 43 + AppToast 1 + practice-filters（约 14）+ PracticeView 4 ≈ **62**。关键：voice 相关测试在改引用 `AppToast` 后仍全过，基线 43 不回归。

- [ ] **Step 2: 构建检查**

Run: `npm run build`
Expected: 构建成功，无未解析导入（确认 `@/components/AppToast.vue`、`practice-data.json`、`practice-filters.js` 均正确解析），无 Vue 编译告警。

- [ ] **Step 3: 手动起服务肉眼验收**

Run: `npm run dev` → 打开 `http://localhost:5173/#/practice`
逐项核对：
- 头条 3 张自动轮播（5s）、悬停暂停、箭头/圆点可切、点卡片平滑滚到成果列表。
- 概况 4 卡进入视口时计数动画；下方文案每 3s 切换。
- 人物 8 卡；点标签只显示该类；点卡片弹采访弹窗，故事分段显示（≥600 字，非问答体），点赞/收藏可切；ESC 与点遮罩关闭。
- 视频 4 卡；点卡片弹播放占位框；ESC/遮罩关闭。
- 成果 12 卡；搜索、排序、三组标签、清除筛选均实时生效；筛选路径同步；点卡片 Toast「详情页即将上线」。
- 「上传我的成果」Toast「请登录后上传成果」。
- 暖绿米白配色与 voice 一致；响应式（窄屏概况 2×2、卡片单列）。

- [ ] **Step 4: 确认清理**

- `src/modules/voice/VoiceToast.vue` 已删除，全仓无残留引用（搜索 `VoiceToast` 应无命中）。
- 无临时/调试文件遗留。

Run: `grep -rn "VoiceToast" src/ || echo "clean"`
Expected: 打印 `clean`。

- [ ] **Step 5: 更新记忆**

在 `shuxiang-frontend-refactor.md` 记一笔：乡村实践页（期一）已完成（头条/概况/人物/视频/成果 + 共享 AppToast），详情页与多级联动留期二。

- [ ] **Step 6: 收尾提交（如有未提交改动）**

```bash
git add -A
git commit -m "test(practice): 全量回归通过，乡村实践页期一完成"
```

---

## 完成标准（Definition of Done）

- 7 栏目中「乡村实践」不再是 PageScaffold 占位，为完整内容页。
- `npm test` 全绿（≈62），`npm run build` 成功。
- voice 与 practice 共用 `AppToast`，旧 `VoiceToast.vue` 删除且无残留引用。
- 人物采访为 ≥600 字叙事体长文（非问答），陈大爷用文档原文，其余 7 人原创。
- 成果卡点击仅 Toast「详情页即将上线」；详情页、多级联动、真实上传/视频源为期二/非目标。

