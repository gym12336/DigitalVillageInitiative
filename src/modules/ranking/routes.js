// 乡村榜单已升级为「荣誉榜单」。本路由重定向到新页，避免旧链接 404。
export default [
  { path: '/ranking', name: 'ranking', redirect: '/villages/honors' },
]
