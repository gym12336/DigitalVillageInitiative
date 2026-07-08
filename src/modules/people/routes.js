// 乡村人物已并入乡村百科：作为村庄详情页的模块。本路由重定向到名录，避免旧链接 404。
export default [
  { path: '/people', name: 'people', redirect: '/villages' },
]
