# AI 禁飞区（No-Fly Zone）

> **给 AI 的硬指令**：以下列出的文件是本项目的「AI 禁飞区」，**禁止 AI 生成、改写、重构**。
> AI 只可阅读它们以理解上下文，或在被明确要求时给出「思路建议」，但**不得直接产出这些文件的代码**。
> 需要改动时，必须由人类手写。—— 对应武大软工 2026 暑期实训「AI 禁飞区」规则。

---

## 一、什么是禁飞区（一句话）

每个项目选 **3 个核心功能必须手写**，AI 只许看不许写；验收时导师现场抽查，要求**逐行讲解**，讲不出即该模块 0 分。

本项目是「乡村数字资源库 + AI 辅助方案生成」Web 项目，选定的 3 个禁飞区如下。

---

## 二、三大禁飞区总览

| 编号 | 名称 | 核心文件 | 行数 | 对应官方示例 | 手写/讲解人 |
|------|------|---------|------|------------|-----------|
| 禁飞区① | 认证授权全链路 | `server/lib/token.js`<br>`server/middleware/auth.js`<br>`server/services/userService.js` | 21 + 29 + 64 = **114** | 认证授权模块 | **甲（PO+SM）** |
| 禁飞区② | AI 输出防火墙 | `server/lib/planSchema.js` | **113** | 核心业务逻辑 | **甲（PO+SM）** |
| 禁飞区③ | LLM 安全通道 | `server/lib/deepseek.js` | **174** | 核心业务逻辑（外部调用） | **乙（QA+开发）** |

> **验收提示**：源码会随迭代增删，**行号可能漂移**。下方讲解表以「函数名 + 逻辑锚点」为准，行号仅供快速定位（截至 2026-07-14 准确）。现场讲解请指向函数，不要死记行号。

---

## 三、禁飞区①：认证授权全链路

**它解决什么**：用户注册 → 登录 → 签发 JWT → 每次请求鉴权的完整闭环。不用任何第三方认证框架，只用 `jsonwebtoken`（签发/验签）和 `bcryptjs`（密码哈希）两个底层库。

**数据流（背下这三行就能讲清全貌）**：
```
注册：查用户名是否重复 → bcrypt.hash 加盐哈希 → 写库 → 返回公开 user（不含密码）
登录：查用户 → bcrypt.compare 比对 → 成功返回公开 user
鉴权：取 Authorization 头 → 正则提 Bearer token → jwt.verify 验签 → 再查库确认用户存在 → 挂 req.user
```

### token.js —— JWT 签发与校验（21 行）
| 锚点 | 讲解要点 |
|------|---------|
| `EXPIRES_IN = '7d'` | token 7 天过期，平衡安全与免登录体验 |
| `signToken(userId, secret)` | 签发。`secret` **显式当参数传入**，不从全局读——这样单元测试能塞假 secret |
| 载荷 `{ userId }` | token 里**只存 userId**，不塞角色/权限，保持 token 轻量；权限每次现查 |
| `if (!secret) throw` | 防御式编程：secret 缺失立刻报错，绝不静默用 undefined 去签发 |
| `verifyToken` 里 `jwt.verify` | 验签。签名错/过期/格式错时 `jwt.verify` **自动抛异常**，我们不吞，交给中间件转 401 |

### middleware/auth.js —— 请求鉴权中间件（29 行）
| 锚点 | 讲解要点 |
|------|---------|
| `makeAuth(secret, db)` | **工厂函数**：把 secret 和 db 注入进来，测试时可换内存数据库 |
| `header.match(/^Bearer\s+(.+)$/i)` | 用正则从 `Authorization: Bearer xxx` 里提 token，`i` 忽略大小写 |
| `if (!m) return next(httpError(401,...))` | 没带 token → 401，不暴露内部细节 |
| `try { verifyToken } catch → 401` | 验签失败统一转「登录已失效」，不把底层异常抛给前端 |
| `db.prepare(...).get(userId)` | **关键安全点**：验签通过后**再查一次库**，防止 token 有效但用户已被删除 |
| `req.user = { id, username }` | 只挂身份，**不挂 teamId**——「是不是某队成员」交给业务层按需查 |

### services/userService.js —— 用户读写 + 密码哈希（64 行）
| 锚点 | 讲解要点 |
|------|---------|
| `BCRYPT_COST = 10` | bcrypt 10 轮哈希，安全与性能的平衡点 |
| `toPublicUser()` | **安全保障**：对外的 user 对象**绝不含 password 字段**；teams 为空返回 `[]` 而非 null |
| `register()` 先查重 | 用户名已存在 → 抛 409；否则 `bcrypt.hash` 后写库 |
| `login()` 统一 401 | **用户名不存在**和**密码错误**都抛同一句「用户名或密码错误」——攻击者无法枚举哪些用户名存在 |
| `bcrypt.compare` | 用哈希比对，**从不解密**（bcrypt 不可逆） |

---

## 四、禁飞区②：AI 输出防火墙（planSchema.js，113 行）

**它解决什么**：这是**系统信任 AI 的边界线**。大模型返回的 JSON 方案，必须先过 `validatePlanShape()` 结构校验；不合格就丢弃、走本地兜底。防止 AI 幻觉/乱写字段直接进数据库。

**核心契约**：
```
LLM 返回的 JSON  →  validatePlanShape(input)  →  { ok:true, plan } 或 { ok:false, reason }
```

**三层校验链（背这三层就够）**：
| 层 | 锚点 | 干什么 |
|----|------|-------|
| 第一层 | `if (!input \|\| typeof input !== 'object')` / `!Array.isArray(input.phases)` | 顶层必须是对象、`phases` 必须是数组，否则直接 `{ok:false}` |
| 第二层 | `for (const p of input.phases)` + `stageSeen` | 遍历阶段；`if (!STAGES.includes(p.stage)) continue` **丢弃 AI 编造的未知阶段**（如它乱加个 "review"）；最后检查 plan/track/result **三段缺一不可** |
| 第三层 | `normTask(t)` | 每条任务必须有非空 `text`，空任务**直接剔除**；`normStr`/`normStringArray`/`normMetrics` 把所有字段规范化，未知字段一律丢弃 |

**要能回答的追问**：
- 「为什么缺一段就整个不合格，而不是补个空段？」→ 因为缺段说明 AI 没理解任务结构，走本地兜底比拿半成品更靠谱。
- 「未知字段为什么丢弃？」→ 不让 AI 随手多写的字段污染档案数据结构。

---

## 五、禁飞区③：LLM 安全通道（deepseek.js，174 行）

**它解决什么**：项目对接大模型的**唯一入口**。API Key 只在服务端读，前端永远拿不到。所有 LLM 调用都走这里，统一做超时、重试、错误分类。

**核心函数 `chatJSON()` 的讲解要点**：
| 锚点 | 讲解要点 |
|------|---------|
| `apiKey = process.env.DEEPSEEK_API_KEY` | **密钥隔离**：只从服务端环境变量读，绝不下发前端 |
| `NoKeyError` vs `DeepseekError` | **错误分类**：区分「没配 key（配置问题）」和「网络/服务失败（临时问题）」，上层据此决定是否兜底 |
| `response_format: { type: 'json_object' }` | **强制 JSON 输出**，配合禁飞区② 的校验形成闭环 |
| `AbortController` + `setTimeout(abort, 20s)` | **20 秒超时**：防止请求挂死拖垮服务 |
| `try attempt() catch → 再 attempt()` 一次 | **单次重试**：网络抖动/限流常见；但 `if (e instanceof NoKeyError) throw e` **没 key 不重试**（重试也没用） |
| `finally { clearTimeout(timer) }` | 无论成功失败都清定时器，防内存泄漏 |
| `chatVision()`（尾部） | 多模态接口。**诚实降级**：deepseek-chat 不支持图片，会 HTTP 报错、上层捕获降级；接口就位，换支持视觉的模型即可启用 |

**要能回答的追问**：
- 「没 key 为什么不重试？」→ 配置问题重试多少次都失败，快速抛错让上层走兜底。
- 「为什么把 fetch 做成可注入参数？」→ 单元测试时能塞假 fetch，不真的发网络请求。

---

## 六、禁飞区与 AI 的协作边界

```
        AI 可以参与                          禁飞区（人手写）
  ┌────────────────────┐             ┌──────────────────────┐
  │ · 方案生成（经②校验）│  ──输出──▶  │ ① 认证授权            │
  │ · 结构化信息提取     │             │ ② 输出校验 planSchema │
  │ · 叙事文案生成       │             │ ③ LLM 通道 deepseek   │
  └────────────────────┘             └──────────────────────┘
              原则：AI 只吐结构化数据，不吐可执行的核心逻辑代码
```

---

## 七、设计先行附录（不算正式禁飞区，作为加分项展示）

以下为「设计先行、Sprint2 实现」的模块，验收时只讲**设计思路**，不计入 3 个手写禁飞区：
- `server/lib/planTemplate.js`（268 行）—— 离线规则引擎，LLM 不可用时的本地兜底。
- `compile.js` + `renderer.js` —— 可视化「意图→Spec→ECharts」双核（Grammar of Graphics 思想）。

详见 [docs/禁飞区设计方案.md](../docs/禁飞区设计方案.md) 的第五、六节。
