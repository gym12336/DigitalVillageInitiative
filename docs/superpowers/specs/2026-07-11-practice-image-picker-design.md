# 搭建台图片组件 — 从实践选取图片 设计

## 概述

在 builder 可视化编辑器的图片组件中，新增"从实践选取"导入方式。用户在 PropertyPanel 中编辑图片组件时，除了手填 URL 外，还可以从当前实践档案已上传的图片素材中一键选取。

## 架构

提取独立组件 `PracticeImagePicker.vue`，封装图片选取的完整逻辑。PropertyPanel 在图片属性区引入并使用。

```
PropertyPanel.vue (图片区)
  ├─ <input v-model="src">          ← 保留，手填 URL
  ├─ <PracticeImagePicker>          ← 新增，从实践选取
  │     ├─ 触发按钮："📁 从实践选取"
  │     └─ 下拉面板（toggle 展开/收起）
  │           ├─ 加载中：spinner
  │           ├─ 空状态："当前档案暂无图片"
  │           └─ 缩略图网格：点击 → emit('select', url)
  └─ 其他属性（alt、objectFit...）
```

### 涉及文件

| 文件 | 变更 |
|------|------|
| `src/modules/builder/editor/PracticeImagePicker.vue` | **新建**，图片选择器组件 |
| `src/modules/builder/editor/PropertyPanel.vue` | 图片属性区引入 PracticeImagePicker |
| API 层 | 无需新建，复用现有 `GET /api/dossiers/:id` 端点 |

### 为什么抽独立组件

- PropertyPanel.vue 已承载 8 种组件的属性编辑（450+ 行），继续内联会加剧膨胀
- 独立组件可复用到后续需要引用实践素材的其他场景（如 timeline 插图、datatable 图片列）
- 职责单一，易于单独测试

## 数据流

```
GET /api/dossiers/:dossierId
  → 取出 payload.collected.materials
  → 过滤 kind === 'image' 的条目
  → 得到 [{ name, url, note, ext }]
```

### 关键决策

- **不新建 API**：复用现有 `GET /api/dossiers/:id`，dossierId 从 Vue Router 的 `route.params.dossierId` 获取
- **每次展开时重新请求**：不缓存。dossier 数据量小，请求成本低，且用户在实践侧新增图片后展开即可看到最新列表
- **仅过滤 `kind === 'image'`**：其他类型（doc/av/table/other）不在缩略图网格中展示
- **图片 URL 直接使用**：material.url 形如 `/uploads/practice/xxx/yyy.png`，服务器已通过 `express.static` 挂载 `/uploads/practice`

### 错误处理

| 场景 | 行为 |
|------|------|
| API 请求失败 | 下拉面板内显示"加载失败，请重试"，不影响画布和其他属性编辑 |
| dossierId 为空 | 按钮正常显示，点击后提示"请先选择实践档案" |
| 图片 URL 404（运行时） | 与手填 URL 行为一致，属于运行时问题，不在选择器内处理 |

## 组件接口

```js
// Props
{
  dossierId: String,   // 必填，当前 dossier ID
  modelValue: String,  // 可选，当前已选的 url（用于高亮已选项）
}

// Emits
{
  'update:modelValue': (url: String)  // 选中图片后，v-model 更新
  'select': (material: Object)        // 选中图片后，传递完整 material 对象
                                      // material: { name, url, note, ext, kind }
}
```

- 支持 `v-model` 绑定当前值，已选中的缩略图显示高亮边框
- `select` 事件传递完整 material，方便 PropertyPanel 顺便将 `alt` 默认设为图片的 `name` 或 `note`
- 组件不暴露内部状态（展开/收起、加载状态）给外部，保持封装

## UI 布局

### 关闭态

图片属性区原样保留 URL 输入框，在下方新增按钮：

```
┌─────────────────────────────────┐
│  图片 URL                       │
│  [https://...              ]    │
│                                 │
│  [📁 从实践选取]                 │  ← 新增
│  替代文本 / 填充模式 / ...      │  ← 后续属性不变
└─────────────────────────────────┘
```

### 展开态

下拉面板定位在按钮正下方，宽度撑满属性面板：

```
┌─────────────────────────────────┐
│  图片 URL                       │
│  [https://...              ]    │
│                                 │
│  [📁 从实践选取]                 │
│  ┌───────────────────────────┐  │
│  │  📁 从实践选取        ✕   │  │  ← header + 关闭按钮
│  │  ──────────────────────── │  │
│  │  ┌──────┐ ┌──────┐ ┌────┐ │  │
│  │  │      │ │      │ │    │ │  │  ← 3 列缩略图网格
│  │  │ img1 │ │ img2 │ │img3│ │  │     cover 填充
│  │  │      │ │      │ │    │ │  │
│  │  └──────┘ └──────┘ └────┘ │  │
│  │  照片1    照片2    照片3    │  │  ← 图片 name，溢出省略
│  └───────────────────────────┘  │
└─────────────────────────────────┘
```

### 规格

| 属性 | 值 |
|------|------|
| 列数 | 3 列 |
| 缩略图尺寸 | 宽 100%，高 75px，`object-fit: cover` |
| 网格间距 | 8px |
| 面板最大高度 | 300px，超出纵向滚动 |
| 已选标识 | 2px 蓝色边框 + 浅蓝底色（`#e8f4fd`） |
| 关闭方式 | 点击面板外部 / 点击 ✕ / 选中图片后自动关闭 |

### 空状态

```
┌───────────────────────────┐
│  📁 从实践选取        ✕   │
│  ──────────────────────── │
│                           │
│       🖼                  │
│   当前档案暂无图片          │
│                           │
└───────────────────────────┘
```

### 加载中

```
┌───────────────────────────┐
│  📁 从实践选取        ✕   │
│  ──────────────────────── │
│                           │
│       ⟳ 加载中...         │
│                           │
└───────────────────────────┘
```

## 实现要点

1. **面板定位**：下拉面板使用 `position: absolute`，相对按钮容器定位，`z-index` 确保不被画布遮挡
2. **点击外部关闭**：通过 `document.addEventListener('click', handler, true)` 捕获阶段监听，判断点击目标是否在面板内部
3. **选中自动关闭**：点击缩略图 → emit → 自动收起面板，减少一步操作
4. **alt 自动填充**：选中图片时，如果当前 `alt` 为空，自动填入图片的 `name`（去掉扩展名）
5. **dossierId 来源**：从 Vue Router 的 `route.params.dossierId` 获取，与 BigComponentEditor 一致

## 与现有代码的关系

- 不影响实践侧的图片上传逻辑
- 不影响已保存文档中的图片组件（url 仍然是字符串，只是来源多了一条路径）
- 不新增后端 API
- 不影响 DisplayWorkbench（展示端也是通过 src 渲染，对图片来源无感知）
