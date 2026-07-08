// DeepSeek OpenAI 兼容接口薄封装。仅供 planService 调用；密钥只在服务端读。
// 失败/超时/无 key 均抛特定 Error，由上层判断兜底策略。

const DEFAULT_ENDPOINT = 'https://api.deepseek.com/chat/completions'
const DEFAULT_MODEL = 'deepseek-chat'
const DEFAULT_TIMEOUT_MS = 20_000
const DEFAULT_MAX_TOKENS = 2000

// 特定错误类型：让上层能区分「无 key」与「网络/服务失败」。
export class NoKeyError extends Error {
  constructor() {
    super('DEEPSEEK_API_KEY 未配置')
    this.name = 'NoKeyError'
  }
}
export class DeepseekError extends Error {
  constructor(message, cause) {
    super(message)
    this.name = 'DeepseekError'
    if (cause) this.cause = cause
  }
}

/**
 * 调 DeepSeek Chat（强制 JSON 输出），返回解析后的对象。
 * opts: { system, user, apiKey, model, endpoint, timeoutMs, maxTokens, fetch }
 * - 20s 超时（AbortController）。
 * - 失败一次重试；无 key 直接抛 NoKeyError（不重试）。
 * - 依赖注入 fetch，便于单测；缺省用全局 fetch（Node 20.6+ 内置）。
 */
export async function chatJSON({
  system,
  user,
  apiKey = process.env.DEEPSEEK_API_KEY,
  model = DEFAULT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxTokens = DEFAULT_MAX_TOKENS,
  fetch: fetchImpl = globalThis.fetch,
} = {}) {
  if (!apiKey) throw new NoKeyError()
  if (!fetchImpl) throw new DeepseekError('fetch 不可用')

  const body = {
    model,
    messages: [
      { role: 'system', content: system || '' },
      { role: 'user', content: user || '' },
    ],
    response_format: { type: 'json_object' },
    max_tokens: maxTokens,
    temperature: 0.4,
  }

  const attempt = async () => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const res = await fetchImpl(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
      if (!res.ok) {
        const text = await safeReadText(res)
        throw new DeepseekError(`DeepSeek HTTP ${res.status}: ${text.slice(0, 200)}`)
      }
      const data = await res.json()
      const content = data?.choices?.[0]?.message?.content
      if (!content || typeof content !== 'string') {
        throw new DeepseekError('DeepSeek 返回缺少 message.content')
      }
      let parsed
      try {
        parsed = JSON.parse(content)
      } catch (e) {
        throw new DeepseekError('DeepSeek 返回不是合法 JSON', e)
      }
      return parsed
    } finally {
      clearTimeout(timer)
    }
  }

  try {
    return await attempt()
  } catch (e) {
    if (e instanceof NoKeyError) throw e
    // 单次重试：网络抖动/临时限流常见。
    try {
      return await attempt()
    } catch (e2) {
      if (e2 instanceof DeepseekError) throw e2
      throw new DeepseekError(e2?.message || 'DeepSeek 调用失败', e2)
    }
  }
}

async function safeReadText(res) {
  try {
    return await res.text()
  } catch {
    return ''
  }
}
