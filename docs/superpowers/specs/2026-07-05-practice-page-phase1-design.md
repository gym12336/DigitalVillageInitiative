# 乡村实践页设计（期一：主体 + 成果列表）

日期：2026-07-05
范围：DigitalVillageInitiative 前端，`src/modules/practice/` 栏目页
分期：期一 = 页面主体 + 成果列表（本文档）；期二 = 成果详情页（10 模块，另立 spec）

## 背景与目标

乡村实践栏目当前是 `PageScaffold` 占位。本期按《一、设计风格与配色.md》第五节，把它建成有真实内容的完整栏目页，沿用已建成的乡村之声（voice）模块模式。内容用文档列出的真实名字（陈大爷、浙江大学、陈家铺村等），与首页/地图的 12 名村一致；图片用 Unsplash 占位。

## 已确认决策

- **详情页分两期**：本期成果卡点击只 Toast「详情页即将上线」，不做详情页。
- **多级联动筛选延后**：文档要求的实践地区五级联动 + 高校二级联动本期不做（voice 页也未做）。本期用水平标签筛选（实践类型 / 成果形式 / 年份）+ 关键词搜索 + 排序。地区/高校联动留到期二或单独做。
- **Toast 抽成共享组件**：把 `voice/VoiceToast.vue` 抽为 `components/AppToast.vue`，voice 与 practice 共用，voice 改为引用共享组件（顺手的合理改进）。
- **头条卡片点击先滚动到成果列表**（详情页下期做）。
- **内容口径**：用文档真实内容，图片 Unsplash 占位。

## 文件结构

- `src/modules/practice/PracticeView.vue` — 页面主体，替换现有占位。
- `src/modules/practice/practice-data.json` — 全部数据：头条 3、概况 4 项、人物 8、视频 4、成果 12。
- `src/components/AppToast.vue` — 新增共享 Toast（从 VoiceToast 抽出）。
- `src/modules/voice/VoiceView.vue` — 改为引用 `AppToast`；删除 `voice/VoiceToast.vue`。
- 人物采访弹窗、视频播放弹窗内联在 PracticeView（同 voice 的详情模态框做法：Teleport + transition + ESC 关闭 + 点遮罩关闭）。

## 页面模块（从上到下）

1. **头条轮播**「🔥 精选成果 · 本周热门」：3 张成果卡，自动轮播 5s + 悬停暂停 + 左右箭头 + 圆点指示。点击 → 平滑滚动到成果列表区（`scrollIntoView`）。数据：陈家铺竹编调研·浙大 / 宏村古建保护·东南大学 / 扎尕那生态旅游·兰州大学。

2. **页面头部**：kicker「乡村实践」+ 标题「乡村实践 —— 用脚步丈量，用实践记录」+ 描述 + 统计「共 423 份成果 ｜ 覆盖 156 个乡村」+ 右上角【上传我的成果】按钮（Toast「请登录后上传成果」）。复用 voice 的 `.page-head` 样式结构。

3. **模块一 · 实践概况**：4 个滚动计数卡，复用首页 `components/CountUp.vue`。数据：总实践天数 1286 / 参与团队 267 / 受益村民 12458 / 已完成需求 89。下方一句动态文案，每 3 秒切换（`setInterval`，onBeforeUnmount 清理），共 3 句循环。

4. **模块二 · 乡村人物**：标题 + 描述。标签筛选栏（全部/非遗传承人/村干部/乡村教师/手工艺人/生态守护者/致富带头人/返乡青年/老村民），水平胶囊，选中高亮。人物卡网格（8 人，`auto-fill minmax` 3-4 列）：圆形头像（姓名首字母 + 麦色底）、姓名 + 身份、所在乡村（📍）、2-3 标签、一句话故事、【阅读采访故事】。点卡片弹**采访故事弹窗**：大头像 + 姓名 + 身份 + 村 + 完整标签 + 采访故事全文（文档已给陈大爷示例，其余 7 人各写一段真实向叙事）+ 点赞/收藏。

5. **模块三 · 乡土视频**：标题 + 描述。4 个视频卡（16:9 封面 Unsplash + 标题 + 团队 + 时长）。点击弹**视频播放模态框**：占位播放器（`<video>` 或占位图 + 说明）+ 标题 + 团队 + 时长。数据：竹编记忆·浙大·15:32 / 时光的守望·东南大学·12:18 / 云端人家·兰大·18:45 / 晒秋的颜色·江西师大·08:20。

6. **模块四 · 成果列表**：
   - 搜索栏「搜索成果标题、团队名称、关键词...」。
   - 排序胶囊：最新上传 / 最热浏览 / 最多收藏 / 最多点赞。
   - 水平标签筛选：实践类型（全部|产业调研|文化挖掘|教育帮扶|乡村规划|科技助农|健康帮扶|数字赋能）、成果形式（全部|调研报告|影像记录|设计方案|文创产品|数据可视化|口述史）、年份（全部|2026|2025|2024）。
   - 当前筛选路径 + 清除筛选。
   - 成果卡网格（12 个，3 列）：封面 16:9、标题、学校（显眼 `--color-primary`）、团队、实践村 + 省、类型标签 + 形式标签、年份、「学院团委推荐」认证、互动数据（浏览 | 点赞 | 下载）。点卡片 → Toast「详情页即将上线」。

## 数据模型（practice-data.json）

```
{
  "highlights": [ { id, title, school, village, province, oneLine, tag, cover } ],   // 头条 3
  "overview": { days, teams, villagers, demands },                                    // 概况 4 项
  "rotatingTexts": [ "...", "...", "..." ],                                          // 动态文案 3 句
  "people": [ { id, name, role, village, tags[], oneLine, story } ],                 // 人物 8，story 为采访全文
  "videos": [ { id, title, team, duration, cover } ],                                // 视频 4
  "results": [ { id, title, school, team, village, province, type, form, year,
                 cert, views, likes, downloads, cover } ]                            // 成果 12
}
```

## 纯函数与测试

抽纯函数便于单测（放 `practice/practice-filters.js` 或就近）：
- `filterPeople(people, tag)` — 按人物标签过滤。
- `filterResults(results, { keyword, type, form, year })` — 多条件过滤。
- `sortResults(results, sortBy)` — 四种排序。

测试（vitest，沿用现有模式）：
- practice-filters：人物标签过滤、成果多条件过滤、四种排序各一例、清除筛选后全量。
- PracticeView 挂载冒烟：渲染标题、人物卡数、成果卡数；点成果卡触发 Toast。
- AppToast：show 显示文本、自动消失。
- 保持现有 43 测试基线不回归（改动 voice 引用 AppToast 后，voice 相关测试仍需通过）。

## 交互动效

- 头条轮播：5s 自动 + 悬停暂停 + 箭头 + 圆点，`prefers-reduced-motion` 下停用自动轮播。
- 计数动画：复用 CountUp。
- 卡片悬停上浮 + 阴影加深（沿用主题 `--shadow-card-hover`）。
- 模态框：Teleport + 淡入 + ESC 关闭 + 点遮罩关闭（同 voice）。
- 全站暖绿米白配色，复用 `theme.css` 变量。

## 非目标（本期不做）

- 成果详情页 10 模块（期二）。
- 实践地区五级联动 + 高校二级联动（期二或单独做）。
- 真实上传 / 登录 / 后端（后端化另有 spec）。
- 真实视频源、真实图片（用占位）。
