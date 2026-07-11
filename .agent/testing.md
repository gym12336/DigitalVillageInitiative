# 测试规范

> 测试策略和代码模板。

---

## 测试策略

| 层级 | 工具 | 范围 |
|------|------|------|
| 单元测试 | Vitest | 纯函数、工具库 |
| 组件测试 | Vitest + @vue/test-utils | Vue 组件 |
| API 测试 | Vitest + supertest | Express 路由 |

## 运行测试

```bash
npm test              # 运行所有测试，单次
npm run test:watch    # watch 模式，持续运行
```

## 目录约定

- 测试文件与源文件同目录，命名为 `<name>.test.js`
- 全局测试辅助放 `src/__tests__/`

```
src/lib/villages.js
src/lib/villages.test.js        ← 单元测试

server/routes/auth.js
server/routes/auth.test.js      ← API 测试
```

## 纯函数测试

```js
// src/lib/xxx.test.js
import { describe, it, expect } from 'vitest'
import { myUtil } from './xxx.js'

describe('myUtil', () => {
  it('正常输入返回预期结果', () => {
    expect(myUtil('input')).toBe('expected')
  })

  it('空输入返回默认值', () => {
    expect(myUtil('')).toBe('default')
  })

  it('异常输入抛出错误', () => {
    expect(() => myUtil(null)).toThrow()
  })
})
```

## Vue 组件测试

```js
// src/modules/<id>/IndexView.test.js
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import IndexView from './IndexView.vue'

describe('IndexView', () => {
  it('渲染标题', () => {
    const wrapper = mount(IndexView)
    expect(wrapper.find('h2').text()).toBe('预期标题')
  })

  it('点击按钮触发事件', async () => {
    const wrapper = mount(IndexView)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('submit')
  })
})
```

## API 路由测试

```js
// server/routes/xxx.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { getDb } from '../db/connection.js'
import { migrate } from '../db/migrate.js'

const SECRET = 'test-secret'
const db = getDb()
migrate(db)
const app = createApp({ db, secret: SECRET })

describe('GET /api/xxx', () => {
  it('未登录返回 401', async () => {
    await request(app).get('/api/xxx').expect(401)
  })

  it('登录后返回列表', async () => {
    // 先获取 token
    const { body } = await request(app)
      .post('/api/auth/register')
      .send({ teamName: 'test', password: '123456' })
    const token = body.data.token

    const res = await request(app)
      .get('/api/xxx')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body).toHaveProperty('data')
  })
})
```

## 测试原则

1. **每个分支至少一个用例**：正常、空、错误、边界。
2. **测试应独立**：不依赖其他测试的执行顺序。
3. **快**：单元测试应在毫秒级完成，整体测试套件 < 10 秒。
4. **可读**：`it('做什么', ...)` 描述应让不熟悉代码的人也能理解。
5. **先写测试还是后写**：不强制 TDD，但关键路径必须有测试。

## 测试覆盖目标

- 纯函数工具库（`src/lib/`）：尽可能覆盖所有分支
- 服务层（`server/services/`）：覆盖主要业务流程
- Vue 组件：覆盖渲染和关键交互
- 路由层：覆盖认证和主要 CRUD
