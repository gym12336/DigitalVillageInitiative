// 服务端档案 id 生成，与前端 dossier.js 的 genId 同构（d + 36进制时间戳 + 随机后缀）。
// 迁移导入时由服务端重铸 id，保证跨设备同源 demo 数据不撞主键。
export function genId(now = Date.now(), rand = Math.random()) {
  return `d${now.toString(36)}${Math.floor(rand * 1e6).toString(36)}`
}
