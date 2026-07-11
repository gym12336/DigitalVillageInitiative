# 实践中 AI 富数据 —— 为成果工作台组件提供可直接渲染的内容 设计

- 日期:2026-07-10
- 栏目:乡村实践 · 我的实践 · 实践中(采集)→ 实践后(成果工作台)
- 关联:[[shuxiang-practice-track]] [[shuxiang-internship-ai]];上游 spec `2026-07-10-upload-ai-structuring-design.md`、`2026-07-06-practice-result-visualizer-design.md`
- 范围:第一期 = ①抽取升级 + ②成果综述富数据(经用户拍板)。③工作台内「让 AI 改写」反馈回路留第二期。

## 一、问题

当前 AI 抽取([extractPrompt.js](../../DigitalVillageInitiative/server/services/prompts/extractPrompt.js))被明确限制为「只摘录原文、不加工、宁缺毋滥」,产出是裸字段:人物只有 name/role/quote、指标只有 name/value/unit、材料只有 name/note。上传再多材料也只是平铺罗列,没有综合、没有洞察,不体现 AI 的创新运用。

下游成果工作台(低代码 studio)的组件通过数据插槽绑定 `dossier.collected.{metricValues, materials, people}`(见 [registry.js](../../DigitalVillageInitiative/src/modules/practice/lowcode/registry.js) DATA_SOURCES),组件拿到的就是这些裸字段,所以人物卡没故事、成果页没有一段像样的综述文字。

用户诉求:让实践中的 AI 成为「组件富数据的生产者」——它产出的内容直接是工作台组件能渲染的东西(人物档案有故事简介、指标有解读、外加一段成果综述可绑文本组件),工作台专注组件交互与布局,组件里的实践内容由这里的 AI 提供「原版」。

## 二、核心思路:富字段追加,向后兼容

给 `collected` 里已有的三个数组,每项**追加可选 AI 富字段**;新增作品级 `collected.summary` / `collected.highlights`。原有裸字段保留,组件渲染**优先读富字段、缺则回退裸字段**。

关键安全性(已核对 [validate.js](../../DigitalVillageInitiative/src/modules/practice/lowcode/validate.js)):作品树校验只管 block 的 type/坐标/props 白名单/插槽绑定,**不校验 collected 数据项的字段**。因此给数组项加字段是纯数据级变更,零校验风险、零 schema 迁移(collected 是 payload JSON)。

## 三、① 抽取升级:从「摘录」到「理解 + 加工」

改 `extractPrompt.js` 的 system,在保留「不编造事实数字」底线的前提下,允许 AI 基于原文做**归纳性加工**,每类各加富字段:

- 人物 people[] 追加:
  - `story` — 2-3 句人物故事简介(基于原文归纳,可读、成段,供人物墙卡片正文)
  - `highlight` — 一句身份亮点标签(如「返乡创业带头人」)
- 指标 metrics[] 追加:
  - `insight` — 一句解读(如「季度销量增长 150%,是本次帮扶最亮眼的成效」)
  - `isHighlight` — boolean,是否重点指标
- 材料 materialHints[] 追加:
  - `summary` — 该材料一句话内容摘要
  - `theme` — 主题归类(自由文本,如「产业帮扶」「文化记录」)

约定:事实性字段(name/value/unit/quote)仍须忠于原文;加工性字段(story/insight/highlight/theme)允许归纳提炼,但不得引入原文没有的数字或事实。confidence 保留。

[practiceExtractService.js](../../DigitalVillageInitiative/server/services/practiceExtractService.js) 的 normPerson/normMetric/normHint 增加对应字段的规范化(补空串/布尔),缺字段不报错。前端 [extract.js](../../DigitalVillageInitiative/src/modules/practice/mine/extract.js) 离线正则兜底同步补空富字段(保证结构一致)。

采纳链路([TrackExtract.vue](../../DigitalVillageInitiative/src/modules/practice/mine/TrackExtract.vue) adopt*)把富字段一起并入 collected 对应项。

## 四、② 成果综述:作品级富数据

新增一次「成果综述生成」:AI 读全部已采集材料(materials 的 text + people + metrics),产出:

- `collected.summary` — 一段 150-250 字、有观点有逻辑的实践成果综述(可直接用于答辩开场)
- `collected.highlights` — 3-5 条成果亮点短句(数组,每条一句)

实现:
- 后端新增 service `practiceSummaryService.js`(仿 practiceExtractService 三级兜底),prompt `summaryPrompt.js`;路由 `POST /api/practice/media/summarize`(body 带 dossierId 或直接 collected 摘要,恒 200,失败回落空)。
- 前端 [TrackExtract.vue](../../DigitalVillageInitiative/src/modules/practice/mine/TrackExtract.vue) 或新加一个「生成成果综述」按钮:调后端 → 结果进待审校(可编辑)→ 采纳写入 collected.summary/highlights → save。
- 综述不自动跑(耗 token 且需材料齐全),由队员在采集到一定程度后手动点。

## 五、让工作台组件消费综述

要让文本类组件绑定综述,需扩展契约(唯一碰 registry 的地方):

- registry DATA_SOURCES 新增:
  - `summary`: { label:'成果综述', kind:'scalar', path:'collected.summary' }
  - `highlights`: { label:'成果亮点', kind:'list', path:'collected.highlights' }
- 给基础组件 `text` 加一个可选插槽 `content`(accepts: ['summary']),缺绑定时用 props.content(现状不变)。
- 新增一个轻量 composite `highlightList`(成果亮点清单,accepts: ['highlights'])——或复用 timeline 结构。第一期可只做 summary 绑 text,highlights 留展示为 KPI 旁注,视工作量定。

渲染器 [renderer.js](../../DigitalVillageInitiative/src/modules/practice/lowcode/renderer.js) 的 view 构建增强:
- viewPeopleWall:输出 story/highlight(卡片正文优先 story,fallback quote)。
- viewKpi / viewBeforeAfter:输出 insight/isHighlight(重点指标高亮)。
- viewTimeline:输出 summary/theme(材料事件带主题标签)。
- 新增 viewText 支持 scalar 插槽 summary。

对应下游消费端(ResultCards.vue 实践后预览 + WorkRenderer.vue 工作台 + exportSite.js 导出)按新 view 字段增量渲染,缺字段回退,不破坏现有展示。

## 六、错误处理

- 抽取/综述:沿用三级兜底(主 AI → 离线 → 空),恒不阻断;综述失败提示「暂未生成,可补充材料后重试」。
- 富字段缺失:所有组件 view 构建对富字段做 `|| ''` / `|| fallback`,老档案(无富字段)照常渲染。

## 七、测试

- 后端:extractPrompt 规范化补富字段(mock chat 返回带 story/insight,断言透传);summaryService 三级兜底(无 key → 空、mock 成功 → summary/highlights)。
- 前端:采纳富字段并入 collected;renderer view 输出富字段 + 老数据回退;registry 新数据源/插槽校验通过。
- 回归:现有 lowcode-kernel、media-route、extract 测试不破;validateWork 对含新 summary/highlights 源的作品判定合法。

## 八、不做(YAGNI / 第二期)

- ③ 工作台内「选中组件 → 让 AI 改写文字/图片」反馈回路(依赖 studio 前端较多改动,第二期)。
- 图片视觉理解(另一独立方向,视觉模型接入待定)。
- 跨多份档案的横向对比分析。
