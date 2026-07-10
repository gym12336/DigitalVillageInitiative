# 移除工作台/编辑台的 DossierPicker 横栏

**日期:** 2026-07-10
**状态:** 已确认

## 目标

从 BigComponentEditor 和 DisplayWorkbench 页面移除 DossierPicker 横栏，dossierId 仅通过路由参数 `/builder/editor/:dossierId` 和 `/builder/display/:dossierId` 自动绑定。

## 动机

当前 DossierPicker 在页面中以一条独立横栏存在（因 flex row 布局实际显示在左侧），增加了视觉噪音。用户导航进入时已携带 dossierId（如从 StageResult 点击"进入成果搭建台"），无需再手动选择。

## 改动

### BigComponentEditor.vue
- 移除 `<div class="editor-dossier-bar">` 模板块
- 移除 `import DossierPicker from '../DossierPicker.vue'`
- 移除 `.editor-dossier-bar` 样式规则

### DisplayWorkbench.vue
- 同上：移除 dossier-bar 模板、import、样式

### builder-displayWorkbench.test.js
- 移除全局 stub 中的 `DossierPicker` mock

## 保持不变

- `DossierPicker.vue` 文件保留（未来可能用于 BuilderHub 等入口）
- `dossierId` 继续从 `route.params.dossierId` 获取
- `EditorCanvas.vue` 中的 dossierId watcher 保留

## 行为

- 无 dossierId 的路由（`/builder/editor`、`/builder/display`）：回退 localStorage
- 带 dossierId 的路由（`/builder/editor/:dossierId`、`/builder/display/:dossierId`）：自动关联 DB 存取
