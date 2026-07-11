# 前端模块开发模式

> 新增功能模块的标准模板和步骤。模块是平台的可插拔功能单元。

---

## 模块目录结构（最小版）

```
src/modules/<module-id>/
├── routes.js       # 必需：路由定义
└── IndexView.vue   # 模块主页面
```

## 模块目录结构（完整版）

```
src/modules/<module-id>/
├── routes.js               # 必需：路由定义
├── <module-id>Api.js       # API 封装（需要后端数据时）
├── IndexView.vue           # 默认首页
├── XXHub.vue               # 模块中枢（多子页面时）
├── SubPageA.vue            # 子页面
├── SubPageB.vue            # 子页面
└── components/             # 模块私有组件
    └── SomeWidget.vue
```

## Step 1：创建模块目录

```bash
cp -r src/modules/_template src/modules/<module-id>
```

## Step 2：注册到 modules.config.js

在 `src/modules.config.js` 增加一条：

```js
{
  id: '<module-id>',
  name: '模块中文名',
  icon: '📦',               // emoji 或 icon 类名
  path: '/<module-id>',
  enabled: true,
  desc: '一句话描述模块功能',
}
```

## Step 3：定义路由 (routes.js)

```js
// src/modules/<module-id>/routes.js
import IndexView from './IndexView.vue'
import SubPage from './SubPage.vue'

export default [
  { path: '/<module-id>', name: '<module-id>', component: IndexView },
  { path: '/<module-id>/sub', name: '<module-id>-sub', component: SubPage },
]
```

路由导出后由 `src/router/index.js` 自动收集，无需手动注册。

## Step 4：编写 Vue 组件

```vue
<template>
  <section class="<module-id>-page">
    <h2>{{ title }}</h2>
    <!-- 页面内容 -->
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const title = ref('页面标题')

onMounted(async () => {
  // 初始化逻辑
})
</script>

<style scoped>
.<module-id>-page {
  padding: 2rem;
}
</style>
```

## Step 5：API 封装（可选）

```js
// src/modules/<module-id>/<module-id>Api.js
const BASE = '/api/<resource>'

export async function fetchList() {
  const res = await fetch(BASE)
  if (!res.ok) throw new Error(`获取列表失败: ${res.status}`)
  return res.json()
}

export async function createItem(payload) {
  const res = await fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`创建失败: ${res.status}`)
  return res.json()
}
```

## 路由命名规范

| 类型 | 模式 | 示例 |
|------|------|------|
| 模块首页 | `/<module-id>` | `/builder` |
| 子页面 | `/<module-id>/<action>` | `/builder/editor` |
| 带参数 | `/<module-id>/<action>/:param` | `/builder/editor/:dossierId` |
| name 属性 | `/<module-id>-<action>` | `builder-editor` |

## 不做什么

- **不要**修改 `src/router/index.js` —— 路由自动扫描。
- **不要**在模块内部引用其他模块的组件 —— 跨模块共享放 `src/components/`。
- **不要**在组件中直接操作 DOM —— 使用 Vue 响应式绑定。
- **不要**在模块内硬编码 API 地址 —— 统一用相对路径或提取到 Api 文件中。
