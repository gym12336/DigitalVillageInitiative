# 移除工作台/编辑台的 DossierPicker 横栏 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 移除 BigComponentEditor 和 DisplayWorkbench 中的 DossierPicker 横栏，dossierId 仅通过路由参数绑定。

**Architecture:** 纯删除操作，无新增文件。

**Tech Stack:** Vue 3

---

### Task 1: 移除 BigComponentEditor 中的 DossierPicker

**Files:**
- Modify: `src/modules/builder/editor/BigComponentEditor.vue`

- [ ] **Step 1: 移除模板中的 dossier-bar**
- [ ] **Step 2: 移除 import DossierPicker**
- [ ] **Step 3: 移除 .editor-dossier-bar 样式**

---

### Task 2: 移除 DisplayWorkbench 中的 DossierPicker

**Files:**
- Modify: `src/modules/builder/display/DisplayWorkbench.vue`

- [ ] **Step 1: 移除模板中的 dossier-bar**
- [ ] **Step 2: 移除 import DossierPicker**
- [ ] **Step 3: 移除 .editor-dossier-bar 样式**

---

### Task 3: 更新测试 mock

**Files:**
- Modify: `src/__tests__/builder-displayWorkbench.test.js`

- [ ] **Step 1: 移除 DossierPicker 的 stub mock**
