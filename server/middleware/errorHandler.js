// 统一错误出口。service/lib 抛带 status 的错误对象，这里转 { error } + 状态码。
// 无 status 视为 500（并在服务端打日志，避免吞掉真实 bug）。

export function errorHandler(err, _req, res, _next) {
  const status = err && err.status ? err.status : 500
  if (status >= 500) {
    // 未预期错误：记日志，响应不泄露内部细节。
    console.error('[errorHandler]', err)
    return res.status(500).json({ error: '服务器内部错误' })
  }
  // 业务错误：状态码 + 消息；409 版本冲突等可带 extra（如 latest）。
  const body = { error: err.message || '请求失败' }
  if (err.latest) body.latest = err.latest
  res.status(status).json(body)
}

// 404 兜底：没匹配到任何路由。
export function notFound(_req, res) {
  res.status(404).json({ error: '接口不存在' })
}
