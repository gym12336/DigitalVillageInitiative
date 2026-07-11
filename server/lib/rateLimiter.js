// 令牌桶速率限制器：限制 DeepSeek API 调用频率（默认 5次/秒）。
// 令牌以恒定速率补充，调用前需获取令牌；无令牌时自动等待。
// 支持设置最大并发数防止瞬时突发。

export class TokenBucket {
  /**
   * @param {number} rate - 每秒补充令牌数（默认 5）
   * @param {number} maxTokens - 最大令牌数/突发容量（默认与 rate 相同）
   */
  constructor(rate = 5, maxTokens = rate) {
    this.rate = rate
    this.maxTokens = maxTokens
    this.tokens = maxTokens
    this.lastRefill = Date.now()
    // 等待队列：{ resolve, reject }
    this.queue = []
  }

  /** 补充令牌（按时间间隔计算应补数量） */
  _refill() {
    const now = Date.now()
    const elapsed = (now - this.lastRefill) / 1000
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.rate)
    this.lastRefill = now
  }

  /** 处理等待队列 */
  _drain() {
    while (this.queue.length > 0 && this.tokens >= 1) {
      const { resolve } = this.queue.shift()
      this.tokens -= 1
      resolve()
    }
  }

  /**
   * 获取令牌，无令牌时等待直到可用。
   * @returns {Promise<void>}
   */
  async acquire() {
    this._refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return
    }
    // 无令牌，进入等待队列
    return new Promise((resolve) => {
      this.queue.push({ resolve })
    })
  }

  /**
   * 尝试获取令牌，不等待。
   * @returns {boolean} 是否获取成功
   */
  tryAcquire() {
    this._refill()
    if (this.tokens >= 1) {
      this.tokens -= 1
      return true
    }
    return false
  }

  /** 剩余令牌数（只读，含浮点） */
  get available() {
    this._refill()
    return this.tokens
  }
}

/**
 * 带重试的限流调用封装。
 * 自动处理 429（Rate Limit）响应：解析 Retry-After 等待后重试。
 *
 * @param {TokenBucket} bucket
 * @param {() => Promise<Response>} fetchFn - 实际的 fetch 调用
 * @param {object} [opts]
 * @param {number} [opts.maxRetries=3] - 最大重试次数
 * @param {number} [opts.baseDelayMs=1000] - 非429错误的基础等待时间
 * @returns {Promise<Response>}
 */
export async function rateLimitedFetch(bucket, fetchFn, opts = {}) {
  const { maxRetries = 3, baseDelayMs = 1000 } = opts

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    // 每次请求前获取令牌
    await bucket.acquire()

    try {
      const res = await fetchFn()

      // 429 限流：等待后重试
      if (res.status === 429) {
        const retryAfter = parseInt(res.headers.get('Retry-After') || '1', 10)
        const waitMs = Math.max(retryAfter * 1000, baseDelayMs)
        await sleep(waitMs)
        continue
      }

      return res
    } catch (err) {
      // 网络错误：退避重试
      if (attempt < maxRetries) {
        const delay = baseDelayMs * Math.pow(2, attempt)
        await sleep(delay)
        continue
      }
      throw err
    }
  }

  throw new Error('rateLimitedFetch: 超过最大重试次数')
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

// 全局单例（所有 AI 调用共享同一限流器）
let _defaultBucket = null

/** 获取全局默认令牌桶（5次/秒） */
export function getDefaultBucket() {
  if (!_defaultBucket) {
    _defaultBucket = new TokenBucket(5, 5)

    // 定时补充 + 排空队列（防止长时间无调用时队列得不到处理）
    const interval = setInterval(() => {
      _defaultBucket._refill()
      _defaultBucket._drain()
    }, 200) // 每200ms处理一次

    // Node 退出前清理
    if (typeof interval !== 'undefined' && interval.unref) {
      interval.unref()
    }
  }
  return _defaultBucket
}

