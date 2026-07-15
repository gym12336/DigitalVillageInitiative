# 编码规范

> 本项目面向 AI 协作编程，以下规范对所有贡献者（人 + AI）统一适用。

> ⛔ **AI 禁飞区**：`no-fly-zone.md` 中列出的文件禁止 AI 生成或改写，仅供阅读参考。改动必须人类手写。
> 关键架构决策见 `decisions.md`。

---

## 语言与注释

- **注释使用中文**，代码标识符使用英文（camelCase / PascalCase / snake_case 按上下文）。
- 每个文件顶部应有简短注释说明用途，公共函数必须写 JSDoc。
- JSDoc 使用中文描述，`@param` / `@returns` 用英文类型名。

```js
/**
 * 根据行政区划代码加载 geoJSON，带缓存。
 * @param {string} adcode - 行政区划代码
 * @returns {Promise<object|null>} geoJSON 对象，失败返回 null
 */
export async function loadGeoJSON(adcode) { ... }
```

## 模块与文件命名

| 层级 | 命名规则 | 示例 |
|------|---------|------|
| Vue 组件 | PascalCase | `BigComponentEditor.vue` |
| JS 模块 | camelCase | `stageEditor.js` |
| 服务层 | `<domain>Service.js` | `dossierService.js` |
| 路由定义 | `routes.js`（每个模块） | `src/modules/builder/routes.js` |
| 测试文件 | `<name>.test.js` | `villages.test.js` |
| 目录 | kebab-case 或单语义单词 | `src/modules/villages/` |

## Vue 规范

- 统一使用 `<script setup>` + Composition API。
- 组件内顺序：`<template>` → `<script setup>` → `<style scoped>`。
- Props 和 emits 使用运行时声明（不做类型注解）。
- 组件目录内，页面级组件命名为 `IndexView.vue` 或 `XXHub.vue`，子组件自由命名。

```vue
<template>
  <section class="my-view">
    <h2>{{ title }}</h2>
  </section>
</template>

<script setup>
const title = '页面标题'
</script>

<style scoped>
.my-view { padding: 2rem; }
</style>
```

## 后端规范

- 使用 Express 5，路由按领域拆分到 `server/routes/<domain>.js`。
- 业务逻辑放 `server/services/<domain>Service.js`，路由只做参数提取和响应。
- 所有路由工厂函数签名为 `(db, secret) => Router`，通过闭包接收依赖。
- 中间件统一放 `server/middleware/`，按职责命名（auth / errorHandler / …）。
- 错误统一抛 `HttpError`（或自定义错误类），由 `errorHandler` 中间件兜底。

## 通用规则

- **不使用 `any` / `var`**。用 `const` 优先，需重赋值用 `let`。
- **优先纯函数**：能无副作用就无副作用，例如 `src/lib/mapDrill.js` 中的状态机纯函数。
- **避免深层嵌套**：if/else 超过 3 层需抽取函数或使用 early return。
- **单一职责**：一个函数只做一件事，超过 40 行的函数需要审视。
- **硬编码写在配置层**：不允许在业务逻辑中散落魔法数字/字符串。
- **import 顺序**：node 内置 → 第三方 → 项目内（`@/` 别名）。

## Git 提交规范

- 提交信息使用英文，格式：`<type>: <description>`
- type 取值：`feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `style`
- 描述小写开头，不超过 72 字符，不加句号。
- 每个提交应是一个原子变更——只做一件事。

```
feat: add sankey chart renderer with parseCSVSankey
fix: correct sankey bezier bottom edge alignment
docs: add sankey chart implementation plan
```
