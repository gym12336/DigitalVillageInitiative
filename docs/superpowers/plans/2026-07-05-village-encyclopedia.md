# 乡村百科栏目重构实现计划

- 作者：gym

**Goal:** 把 `乡村百科`（villages 模块）从简陋占位重构成完整栏目：首页是**村庄目录检索**（行政树省/市/区县联动 + 关键词搜索 + 荣誉标签墙 + 排序 + 头条推荐），点进村庄是**信息丰富的详情页**（大图轮播 + 基本信息 + 认证负责人 + 六大类标签 + 500 字详述 + 导览点位 + 该村实践成果 + 点赞收藏）。村庄封面用真实照片（维基共享 + 主题占位混合）。

**数据策略（关键）:** 现有 `src/data/villages.json` 是 **6 个湖北村**，被首页湖北地图 + 榜单/人物/影像三个旧模块共用，且 `villages.test.js` 锁死「全部为湖北省」。**不动它**。乡村百科按《一、设计风格与配色.md》第五节用**文档的 12 个全国名村**（陈家铺/西递/宏村/扎尕那…），单独建 `src/data/encyclopedia-villages.json`，只给 VillageListView / VillageDetailView 用。两套数据物理分离，互不影响。

**Architecture:** 沿用已建成的 voice / practice 页模式（`<script setup>` 单文件、`--color-*` 暖绿主题变量、共享 `AppToast`、`CountUp`、Teleport 模态、纯函数抽离便于单测）。检索/筛选逻辑抽 `src/lib/encyclopedia.js` 纯函数。

参考规格：《一、设计风格与配色.md》第五节「乡村百科」（头条/头部/搜索排序/多级筛选/荣誉墙/列表/详情 8 模块）。

> 约定：不做独立代码审查环节（见用户偏好）；每个 Task 跑 `npx vitest run <文件>`，收尾 `npm test` + `npm run build`。基线 62 测试须全过。

---

## 文件结构

- 新增 `src/data/encyclopedia-villages.json` — 12 个全国名村，富字段（见数据模型）。
- 新增 `src/lib/encyclopedia.js` — 纯函数：`buildRegionTree` / `filterVillages` / `sortVillages` / `allHonors`。
- 新增 `src/__tests__/encyclopedia.test.js` — 纯函数单测。
- 替换 `src/modules/villages/VillageListView.vue` — 目录检索页（头条+头部+搜索排序+行政树+荣誉墙+卡片网格）。
- 替换 `src/modules/villages/VillageDetailView.vue` — 8 模块详情页。
- 修改 `src/components/VillageCard.vue` — 支持荣誉徽章、认证行、封面 onerror 回退（兼容旧 6 湖北村调用方，字段缺失时降级）。
- 修改 `src/__tests__/VillageDetailView.test.js` — mock 改为新数据文件，断言随新结构更新。
- 新增 `src/__tests__/VillageListView.test.js` — 挂载冒烟：渲染 12 村、关键词/行政树/荣誉墙筛选、点头条。

`src/modules/villages/routes.js` 无需改动（已导出 list/detail）。旧的 ranking/people/media 与首页地图继续吃 `villages.json`，不受影响。

---

## 数据模型（encyclopedia-villages.json，每村一条）

```
{
  "id", "name", "fullName",
  "province", "city", "district", "town",        // 行政四级，供行政树联动
  "coord": [lng, lat],
  "honors": ["中国传统村落", ...],                // 荣誉徽章（对应荣誉墙标签）
  "certLevel": "township|county|province",         // 认证级别：乡镇团委/县级文旅/省级
  "certLabel": "乡镇团委认证",
  "manager": { "name", "role" },                   // 负责人
  "socials": { "wechat": true, "douyin": true, ... },  // 6 平台是否关联（布尔）
  "tags": { "文化类": [...], "自然类": [...], "产业类": [...],
            "荣誉类": [...], "人文类": [...], "新业态类": [...] },  // 六大类分组
  "summary",                                       // 一句话（卡片用）
  "intro",                                         // 500 字以上详述（详情模块5）
  "gallery": [cover1, cover2, cover3],             // 大图轮播（真实/占位混合）
  "cover",                                         // 卡片封面（= gallery[0]）
  "guide": [ { "name", "note" } ],                 // 导览点位（文档已给每村5个）
  "stats": { "views", "favorites", "practices" }   // 排序用（浏览/收藏/实践数）
}
```

12 村的省市区镇、荣誉、认证、导览点位、500 字详述全部取自《一、设计风格与配色.md》第五节（第 100-144 行）。六大类标签按文档第 122 行的分类词表，为每村挑选契合的若干项。

---

## 封面图策略（维基共享 + 主题占位混合）

- **首选**：维基共享真实照片，用稳定重定向格式 `https://commons.wikimedia.org/wiki/Special:FilePath/<文件名>?width=800`。实现时对每村用 WebSearch 查 Commons 真实文件名（本沙箱无法直连校验图片，故靠 onerror 兜底）。已知：西递 `Xidi_-_05.JPG`、宏村 `Hongcun.jpg`。
- **次选**：查不到真实同村照片的，用 Unsplash 同题材占位（古村/梯田/侗寨/雪山等）。
- **兜底**：`<img @error>` 失败时切换到姓名首字色块（VillageCard 已有 `.ph` 占位逻辑，扩展到 onerror）。保证任何 URL 404 都不出现裂图。

---

## Task 1: 建 12 村数据 + 纯函数 + 单测

**Files:** Create `encyclopedia-villages.json` / `encyclopedia.js` / `encyclopedia.test.js`

- [ ] **Step 1: 写 `encyclopedia.js` 纯函数**
  - `buildRegionTree(list)` → `{ 省: { 市: { 区县: [村...] } } }`，供级联下拉。
  - `filterVillages(list, { keyword, province, city, district, honor })` → 关键词匹配 name/fullName/tags/honors，行政级逐级过滤，honor 命中 honors 数组。空/'全部' 不限。
  - `sortVillages(list, sortBy)` → `latest`(默认原序/入驻) / `views` / `favorites` / `practices`，读 stats，返回新数组。
  - `allHonors(list)` → 去重荣誉列表 + 计数，供荣誉墙。
- [ ] **Step 2: 写 `encyclopedia-villages.json`** — 12 村，字段按数据模型填满，intro ≥500 字，封面先占位（Step 4 回填真实图）。
- [ ] **Step 3: 写 `encyclopedia.test.js`** — 内联小样本夹具，覆盖：region tree 结构、关键词过滤、行政三级过滤、honor 过滤、四种排序、allHonors 去重计数、不改入参。
  - Run: `npx vitest run src/__tests__/encyclopedia.test.js` → PASS
- [ ] **Step 4: 回填封面** — 对 12 村各 WebSearch 一次 Commons 文件名，能查到的用 `Special:FilePath` URL 填 `gallery`/`cover`，查不到用 Unsplash 题材占位。
  - Run: `node -e "require('./src/data/encyclopedia-villages.json')&&console.log('ok')"` → ok，且 12 村、每村 gallery≥1。

---

## Task 2: 重写 VillageListView（目录检索页）

**Files:** Replace `VillageListView.vue`；Modify `VillageCard.vue`；Create `VillageListView.test.js`

- [ ] **Step 1: VillageCard 增强** — 加荣誉徽章（`honors[0]` 显眼）、认证行（`✓ certLabel`，按 certLevel 配色 绿/蓝/金）、封面 `@error` 回退到首字色块。保持对旧 6 湖北村（无这些字段）的向后兼容：字段缺失则不渲染对应块。
- [ ] **Step 2: VillageListView 模板** — 从上到下：
  1. **头条推荐轮播**「📌 精选乡村 · 本周推荐」：3 张（陈家铺/西递/扎尕那），复用 practice hero 轮播交互（5s+悬停暂停+箭头+圆点），点卡片 → `router.push('/villages/'+id)`。
  2. **页面头部**：kicker + 标题「乡村百科 —— 一村一页，读懂中国乡村」+ 描述 + 统计「共 12 个乡村」（真实数）。
  3. **搜索栏** + **排序胶囊**（最新入驻/最热浏览/最多收藏/最多实践）。
  4. **行政树级联**：省▼ 市▼ 区县▼ 下拉（`buildRegionTree` 驱动，逐级联动，下级随上级重置）+ 当前筛选路径 + 清除。
  5. **荣誉标签墙**：水平滚动胶囊（`allHonors` + 全部），选中高亮筛选。
  6. **卡片网格**：`filterVillages`+`sortVillages` 结果，`VillageCard` 渲染；空态提示。
- [ ] **Step 3: script** — 接 URL `?q=` 关键词（首页搜索跳转带入）；状态 keyword/sort/province/city/district/honor + 计算属性调纯函数；轮播定时器 onBeforeUnmount 清理。
- [ ] **Step 4: style** — 复用 practice/voice 的 `.hero-*`/`.page-head`/`.search-bar`/`.chips`/`.chip` 观感；新增行政树下拉、荣誉墙样式。
- [ ] **Step 5: VillageListView.test.js** — 渲染 12 卡；输入关键词只剩匹配；选省/荣誉墙筛选生效；点头条卡触发路由跳转（mock router）。
  - Run: `npx vitest run src/__tests__/VillageListView.test.js` → PASS

---

## Task 3: 重写 VillageDetailView（8 模块详情页）

**Files:** Replace `VillageDetailView.vue`；Modify `VillageDetailView.test.js`

- [ ] **Step 1: 模板 8 模块**
  1. **大图轮播**：`gallery` 多图，箭头+圆点切换，封面 onerror 回退。
  2. **基本信息**：村名（大号）+ 省·市·区县·镇 + 荣誉徽章列表。
  3. **认证与负责人**：certLabel（三级配色）+ 负责人姓名职务 + 6 社交平台图标（关联=彩色可点/未关联=灰不可点，用 emoji 或文字标代替 Font Awesome）。
  4. **六大类标签**：`tags` 按类分组展示，每类一行胶囊。
  5. **详细介绍**：`intro` 500 字，段落展示。
  6. **操作按钮区**：`📚 查看该村实践成果` → `router.push('/practice')`（期二再做自动筛选）；`📤 分享` / `🎨 生成海报` / `🗺️ 生成导览地图` → 暂 Toast「功能即将上线」（Canvas 生成留后续）。
  7. **导览点位**：`guide` 列表（点位名 + 说明），简单可视（编号+名称），Canvas 导览图留后续。
  8. **点赞 / 收藏**：本地 reactive 切换（同 practice），右下角浮动或模块内。
- [ ] **Step 2: script** — 从 `encyclopedia-villages.json` 按 `route.params.id` 取村；未找到显示占位；ESC/箭头控制轮播；AppToast 接操作按钮；该村实践成果可从 `practice-data.json` 按 village 名匹配 2-3 条（找不到则省略模块 7 或显示占位）。
- [ ] **Step 3: style** — 暖绿主题，复用模态/卡片/胶囊观感；三级认证配色（绿 `--color-primary`/蓝 `#4a8fbf`/金 `--color-accent`）。
- [ ] **Step 4: 更新 VillageDetailView.test.js** — mock 改 `@/data/encyclopedia-villages.json`（给一条含新字段的样本 + 一条 practice 匹配），断言渲染村名/省市/荣誉/标签分组/负责人/intro 片段。
  - Run: `npx vitest run src/__tests__/VillageDetailView.test.js` → PASS

---

## Task 4: 全量回归与验收

- [ ] **Step 1:** `npm test` → 全绿。总数 = 62 基线 + encyclopedia(约12) + VillageListView(约4)，且 VillageDetailView 改后仍过、villages.test.js（湖北 6 村）不回归。
- [ ] **Step 2:** `npm run build` → 成功，无未解析导入。
- [ ] **Step 3:** `npm run dev` 肉眼验收 `/#/villages`：头条轮播、搜索、行政树联动、荣誉墙、排序、卡片封面（真实图或占位不裂）；点进村庄看 8 模块；`?q=` 从首页搜索带入。
- [ ] **Step 4:** 更新记忆 `shuxiang-frontend-refactor.md`：乡村百科重构完成（12 全国名村独立数据 + 检索页 + 8 模块详情），封面维基+占位混合。

---

## 完成标准（DoD）

- 乡村百科首页 = 目录检索（行政树 + 关键词 + 荣誉墙 + 排序 + 头条），共 12 全国名村。
- 详情页信息丰富（8 模块，intro ≥500 字，六大类标签，导览点位，实践成果关联）。
- 封面真实照片优先、占位兜底、404 不裂图。
- 首页湖北地图 + 榜单/人物/影像 + villages.json 与其测试**零改动**。
- `npm test` 全绿、`npm run build` 成功。
- Canvas 海报/导览图生成、社交真实链接、实践成果自动筛选 = 后续/非目标。
