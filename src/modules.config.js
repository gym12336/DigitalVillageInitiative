// 平台模块清单：新增模块只需在此加一条记录。
// 首页据此渲染入口卡片；路由据 modules/<id>/routes.js 自动收集。
export const modules = [
  { id: 'villages', name: '村庄主页', icon: '🏘️', path: '/villages', enabled: true, desc: '各村数字主页与资源' },
  { id: 'ranking', name: '资源榜单', icon: '🏆', path: '/ranking', enabled: false, desc: '村庄资源排行（建设中）' },
  { id: 'people', name: '人物故事', icon: '👤', path: '/people', enabled: false, desc: '乡村人物纪实（建设中）' },
  { id: 'media', name: '影像库', icon: '🎬', path: '/media', enabled: false, desc: '照片与短视频（建设中）' },
]
