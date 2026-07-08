// 影像记录已升级为「影像长廊」。本路由重定向到新页，避免旧链接 404。
export default [
  { path: '/media', name: 'media', redirect: '/villages/gallery' },
]
