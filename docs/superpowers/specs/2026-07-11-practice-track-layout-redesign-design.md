# 「实践中」采集页面重设 + 上传误触 bug 修复 设计

- 日期：2026-07-11
- 栏目：乡村实践 · 我的实践 · 实践中（采集阶段 StageTrack）
- 关联：[[shuxiang-practice-track]]；上游 spec `2026-07-10-practice-track-ai-collection-design.md`、`2026-07-10-ai-rich-data-for-studio-design.md`
- 性质：纯前端布局重排 + 一处 CSS bug 修复。零后端改动、零 collected schema 变更、零 AI 接口变更。

## 一、问题

1. **点击页面空白处也弹出文件选择框（bug）**：`TrackMedia.vue` 手动登记材料行的「选文件」按钮 `.row-file` 缺 `position: relative`，其内部 `.file-input { position:absolute; inset:0 }` 逃逸到最近定位祖先，透明输入框铺满大片区域，误触频繁。
2. **布局单调、页面过长**：①任务/②AI/③指标/④材料/⑤人物 五个 section 竖向平铺，重点不突出，滚动疲劳。
3. **材料排版差**：图片/音视频/文档/表格混在一个列表里，未按类型归类，缩略图与文字挤一行。
4. **上传入口分散**：顶部上传、每行「选文件」、AI 区传文档三处入口，叠加 bug 更易误触。

## 二、决策（用户拍板）

- 整体布局：**顶部通栏进度 + 左右分栏工作台**。
- 材料归类：**按类型分组**（🖼图片 / 🎬音视频 / 📄文档 / 📊表格 各成一区）。
- 先修 bug，再谈布局。

## 三、布局设计

```
┌─────────────────────────────────────────────┐
│  TrackProgress：四维进度看板 + 督进提示（通栏保留）│
├──────────────────────┬──────────────────────┤
│  左栏：AI 采集工作区    │  右栏：采集成果（Tab）   │
│  · 统一上传区(点/拖拽)  │  [指标] [材料] [人物]    │
│  · 粘贴文本 + AI 提取   │  指标Tab：前后值表格      │
│  · 待审校区(人/指/材)   │  材料Tab：按类型分组      │
│  · 📝 生成成果综述      │  人物Tab：人物访谈表格    │
├──────────────────────┴──────────────────────┤
│  ① 本阶段任务（折叠，默认收起，放底部）           │
│  [保存采集数据]  已保存 ✓                       │
└─────────────────────────────────────────────┘
```

- 窄屏（<900px）：左右栏堆成上下单列，右栏 Tab 保留。

## 四、组件划分

- **StageTrack.vue**：骨架容器。负责左右分栏 grid、右栏 Tab 状态（`activeTab: 'metrics'|'materials'|'people'`）、底部任务折叠 + 保存条。数据 state（clone/save，含 summary/highlights）保持不变。
- **TrackExtract.vue**（左栏，职责不变）：统一上传区 + 粘贴框 + 待审校 + 成果综述。上传区从多入口收敛为一个「点击或拖拽」区域（文档→解析+抽取，图片/音视频→归档）。
- **新增 MaterialGroups.vue**（右栏材料 Tab）：接收 materials 数组，按 kind 分组渲染——图片走缩略图网格、音视频/文档/表格走带图标列表，每项带「查看」（复用现有 MediaPreview）。从 TrackMedia 抽出分组展示职责。
- **TrackMedia.vue**：保留上传/登记逻辑与行内补传；材料的「展示」交给 MaterialGroups。修 `.row-file` bug。指标表格（现③）、人物表格（现⑤）作为右栏对应 Tab 的内容，可保留在 StageTrack 内联或各抽小组件，优先内联以控改动面。

## 五、Bug 修复

`.row-file { position: relative; overflow: hidden; }` — 一处即可。同时审查所有 `.file-input` 的定位祖先都有 `position: relative`（upload-btn、doc-btn 已有，row-file 缺）。

## 六、数据流 / 错误处理 / 兼容

- collected 结构、AI 抽取/综述接口、成果卡消费端全部不变——纯 UI 重排。
- Tab 切换仅前端状态，不影响保存；未保存编辑在切 Tab 时保留（同一 state 引用）。
- 空态：各材料分组无数据时该组隐藏；材料全空时给引导提示。

## 七、测试

- 现有 StageTrack/TrackMedia/TrackExtract 相关测试不回归。
- 新增 MaterialGroups 组件测试：按 kind 正确分组、空组隐藏、查看事件透传。
- bug 修复为 CSS，无法单测，靠 build + 人工验收（点空白不再弹上传）。

## 八、不做（YAGNI）

- 不改后端、不动 collected schema、不改 AI 逻辑。
- 不做拖拽排序材料、不做批量操作。
- 任务清单不做复杂交互，仅折叠收纳。
