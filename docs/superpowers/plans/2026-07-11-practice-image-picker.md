# 搭建台图片组件 — 从实践选取图片 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 builder 图片组件属性面板中增加"从实践选取"按钮，展开下拉缩略图网格，从当前实践档案已上传的图片素材中选取并填入 src。

**Architecture:** 新建独立 `PracticeImagePicker.vue` 组件（封装展开/收起/加载/选择全部逻辑），PropertyPanel 在图片属性区引入使用。数据复用 `GET /api/dossiers/:id` 端点，无新增后端 API。

**Tech Stack:** Vue 3 Composition API (`<script setup>`), 复用 `src/modules/practice/mine/api.js` 的 `apiGetDossier`

**Spec:** `docs/superpowers/specs/2026-07-11-practice-image-picker-design.md`

## Global Constraints

- 不新建后端 API，复用 `GET /api/dossiers/:id`
- dossierId 从 Vue Router `route.params.dossierId` 获取
- 仅展示 `kind === 'image'` 的 material
- URL 输入框保持不变，按钮放在其下方
- 展开后每次重新请求，不缓存
- 无图片时按钮可点，展开显示空状态

---

## File Structure

```
src/modules/builder/editor/
  PracticeImagePicker.vue     ← NEW: 独立图片选择器组件
  PropertyPanel.vue           ← MODIFY: 引入 PracticeImagePicker
```

**Interfaces between files:**

PracticeImagePicker.vue 暴露：
```js
// Props
{ dossierId: String, modelValue: String }
// Emits
['update:modelValue', (url) => {}]
['select', (material) => {}]   // material = { name, url, note, ext, kind }
```

PropertyPanel.vue 消费：
```vue
<PracticeImagePicker
  :dossier-id="dossierId"
  v-model="comp.props.src"
  @select="onImagePicked"
/>
```

---

### Task 1: 新建 PracticeImagePicker.vue

**Files:**
- Create: `src/modules/builder/editor/PracticeImagePicker.vue`

**Interfaces:**
- Produces: `<PracticeImagePicker :dossier-id="..." v-model="..." @select="..." />`
  - Props: `dossierId: String` (必填), `modelValue: String` (可选，当前已选 url)
  - Emits: `update:modelValue(url)` (v-model 更新), `select(material)` (完整 material 对象)

- [ ] **Step 1: 创建组件文件骨架**

```vue
<!-- src/modules/builder/editor/PracticeImagePicker.vue -->
<template>
  <div class="pip-root" ref="rootRef">
    <button class="pip-trigger" type="button" @click="toggle">
      📁 从实践选取
    </button>

    <div v-if="open" class="pip-dropdown">
      <div class="pip-header">
        <span class="pip-header-title">📁 从实践选取</span>
        <button class="pip-close" type="button" @click="open = false">✕</button>
      </div>

      <div v-if="loading" class="pip-status">
        <span class="pip-spinner"></span> 加载中...
      </div>

      <div v-else-if="error" class="pip-status pip-status--error">
        加载失败，请重试
      </div>

      <div v-else-if="images.length === 0" class="pip-status">
        <div class="pip-empty-icon">🖼</div>
        <div>当前档案暂无图片</div>
      </div>

      <div v-else class="pip-grid">
        <div
          v-for="img in images"
          :key="img.url"
          class="pip-thumb"
          :class="{ 'pip-thumb--selected': modelValue === img.url }"
          @click="select(img)"
        >
          <img :src="img.url" :alt="img.name" class="pip-thumb-img" />
          <span class="pip-thumb-name">{{ img.name }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { apiGetDossier } from '../../practice/mine/api.js'

const props = defineProps({
  dossierId: { type: String, required: true },
  modelValue: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'select'])

const rootRef = ref(null)
const open = ref(false)
const loading = ref(false)
const error = ref(false)
const images = ref([])

async function fetchImages() {
  if (!props.dossierId) return
  loading.value = true
  error.value = false
  images.value = []
  try {
    const dossier = await apiGetDossier(props.dossierId)
    const materials = dossier?.payload?.collected?.materials || []
    images.value = materials.filter(m => m.kind === 'image')
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}

function toggle() {
  open.value = !open.value
  if (open.value) fetchImages()
}

function select(img) {
  emit('update:modelValue', img.url)
  emit('select', img)
  open.value = false
}

// Click outside to close
function onDocClick(e) {
  if (rootRef.value && !rootRef.value.contains(e.target)) {
    open.value = false
  }
}

watch(open, (val) => {
  if (val) {
    document.addEventListener('click', onDocClick, true)
  } else {
    document.removeEventListener('click', onDocClick, true)
  }
})
</script>
```

- [ ] **Step 2: 写入样式**

使用 PropertyPanel 现有 CSS 变量和风格，追加到同一文件 `<style scoped>` 中。

```vue
<style scoped>
.pip-root {
  position: relative;
}

.pip-trigger {
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px dashed var(--color-border);
  border-radius: 12px;
  background: rgba(44,125,160,0.03);
  color: #2c7da0;
  font-size: 0.82rem;
  cursor: pointer;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.pip-trigger:hover {
  border-color: #2c7da0;
  background: rgba(44,125,160,0.08);
}

/* --- dropdown panel --- */
.pip-dropdown {
  position: absolute;
  left: 0;
  right: 0;
  top: 100%;
  margin-top: 4px;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  box-shadow: 0 8px 28px rgba(0,0,0,0.12);
  z-index: 100;
  padding: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.pip-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid var(--color-border-light);
}
.pip-header-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--color-text);
}
.pip-close {
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--color-text-light);
  padding: 0.15rem 0.3rem;
  border-radius: 6px;
  line-height: 1;
  transition: all var(--transition-fast);
}
.pip-close:hover {
  color: #c0392b;
  background: rgba(192,57,43,0.06);
}

/* --- status --- */
.pip-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 1.5rem 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-light);
  gap: 0.4rem;
}
.pip-status--error {
  color: #c0392b;
}
.pip-empty-icon {
  font-size: 2rem;
  opacity: 0.5;
}
.pip-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid var(--color-border);
  border-top-color: #2c7da0;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}

/* --- grid --- */
.pip-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.pip-thumb {
  cursor: pointer;
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(44,125,160,0.02);
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.pip-thumb:hover {
  border-color: rgba(44,125,160,0.3);
}
.pip-thumb--selected {
  border-color: #2c7da0;
  background: #e8f4fd;
}

.pip-thumb-img {
  width: 100%;
  height: 75px;
  object-fit: cover;
  display: block;
}

.pip-thumb-name {
  display: block;
  padding: 0.3rem 0.35rem;
  font-size: 0.7rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
}
</style>
```

- [ ] **Step 3: 提交**

```bash
git add src/modules/builder/editor/PracticeImagePicker.vue
git commit -m "feat(builder): add PracticeImagePicker component"
```

---

### Task 2: 在 PropertyPanel 中集成 PracticeImagePicker

**Files:**
- Modify: `src/modules/builder/editor/PropertyPanel.vue`

**Interfaces:**
- Consumes: `PracticeImagePicker` 组件（来自 Task 1）
- 新增 import: `useRoute` from vue-router、`PracticeImagePicker` 组件

- [ ] **Step 1: 在 script 区域添加 import 和 dossierId**

在 [PropertyPanel.vue:356-359](src/modules/builder/editor/PropertyPanel.vue#L356-L359) 处修改：

```js
// 修改前（line 356-359）
import { computed } from 'vue'
import { state, getSelected, deleteComponent } from './stageEditor.js'
import { createComponent } from './componentFactory.js'

// 修改后
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { state, getSelected, deleteComponent } from './stageEditor.js'
import { createComponent } from './componentFactory.js'
import PracticeImagePicker from './PracticeImagePicker.vue'

const route = useRoute()
const dossierId = computed(() => route.params.dossierId || '')
```

- [ ] **Step 2: 在图片属性区插入 PracticeImagePicker**

在 [PropertyPanel.vue:101](src/modules/builder/editor/PropertyPanel.vue#L101)（URL 输入框）之后插入：

```vue
<!-- 图片 URL 输入框（保留） -->
<div class="pp-field">
  <label>图片 URL</label>
  <input type="text" v-model="comp.props.src" placeholder="https://..." />
</div>
<!-- 新增：从实践选取 -->
<div class="pp-field">
  <label>或从实践选取</label>
  <PracticeImagePicker
    :dossier-id="dossierId"
    v-model="comp.props.src"
    @select="onImagePicked"
  />
</div>
<!-- 后续字段不变 -->
<div class="pp-field">
  <label>替代文本</label>
  ...
```

- [ ] **Step 3: 添加 onImagePicked 处理函数**

在 PropertyPanel 的 `<script setup>` 中任意位置添加（如 typeLabel 函数之后）：

```js
function onImagePicked(material) {
  // 如果当前 alt 为空，自动填入图片名称（去掉扩展名）
  if (comp.value && !comp.value.props.alt) {
    const nameWithoutExt = material.name.replace(/\.[^.]+$/, '')
    comp.value.props.alt = nameWithoutExt
  }
}
```

- [ ] **Step 4: 验证：启动应用，手动测试**

```bash
# 启动开发服务器
npm run dev
```

测试路径：
1. 打开 builder 编辑器，选一个实践档案
2. 添加图片组件到画布
3. 在属性面板确认看到 URL 输入框 + "📁 从实践选取" 按钮
4. 点击按钮 → 展开下拉面板
5. 有图片时 → 缩略图网格显示，点击一张 → 面板收起，src 自动填入
6. 无图片时 → 显示"当前档案暂无图片"
7. 切换 dossier → 展开面板，应显示新 dossier 的图片

- [ ] **Step 5: 处理无 dossierId 的边界情况（可选完善）**

如果 builder 可能在未选择 dossier 时打开，PracticeImagePicker 点击时应给出提示。修改 `fetchImages()` 中的空 dossierId 守卫：

在 `PracticeImagePicker.vue` 的 `fetchImages()` 函数顶部（已有的 `if (!props.dossierId) return` 改为显示提示）：

```js
async function fetchImages() {
  if (!props.dossierId) {
    images.value = []
    // 让用户看到"暂无图片"而非静默无反应
    return
  }
  // ... rest unchanged
}
```

实际效果：无 dossierId 时展开面板直接显示空状态。

- [ ] **Step 6: 提交**

```bash
git add src/modules/builder/editor/PropertyPanel.vue
git commit -m "feat(builder): integrate PracticeImagePicker into image PropertyPanel"
```

---

## Verification Checklist

全部任务完成后，执行以下检查：

- [ ] 有图片的 dossier：展开下拉 → 看到缩略图网格 → 点击一张 → src 填入、面板关闭
- [ ] 无图片的 dossier：展开下拉 → 看到"当前档案暂无图片"
- [ ] 未选 dossier：展开下拉 → 显示"当前档案暂无图片"（不报错）
- [ ] 再次展开下拉 → 看到最新的图片列表（每次重新请求）
- [ ] 选中图片后 alt 空时 → alt 自动填入文件名（去扩展名）
- [ ] 选中图片后 alt 非空时 → alt 不被覆盖
- [ ] 点击面板外部 → 面板关闭
- [ ] 点击 ✕ 按钮 → 面板关闭
- [ ] 面板在 PropertyPanel 宽度范围内，不溢出
- [ ] URL 输入框仍然可以正常手动输入
- [ ] 不影响展示端（DisplayWorkbench）的图片渲染
