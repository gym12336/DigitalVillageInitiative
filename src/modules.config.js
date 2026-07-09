// 平台一级栏目清单：导航栏与首页入口卡据此渲染，路由据 modules/<id>/routes.js 自动收集。
// 7 个一级栏目 = 首页 + 下列 6 个内容栏目（首页是品牌链接，单列在导航最左）。
// 原 ranking/people/media 降级为「乡村百科/乡村实践」下的子功能，路由仍保留可访问。
// children（可选）：一级栏目下的子目录，导航栏悬浮时弹出。没有 children 的栏目照旧只是普通链接。
// 目前只有「乡村百科」挂了真实存在的子页（原 ranking/people/media 降级而来）；其余栏目等子页做出来再补 children。
export const modules = [
  {
    id: 'villages', name: '乡村百科', icon: '📖', path: '/villages', enabled: true, desc: '一村一页，读懂中国乡村',
    hook: '从历史沿革到特色资源，为每个村庄建一张会生长的数字名片。',
    metric: '156 个村庄档案',
    children: [
      { name: '荣誉榜单', path: '/villages/honors', desc: '多维度名村排行' },
      { name: '影像长廊', path: '/villages/gallery', desc: '各村实景图墙' },
      { name: '分类浏览', path: '/villages/tags', desc: '按六大类标签逛村' },
    ],
  },
  {
    id: 'practice', name: '乡村实践', icon: '🎓', path: '/practice', enabled: true, desc: '用脚步丈量，用实践记录',
    hook: '汇聚全国三下乡团队的实践成果，用数据、人物与影像记录乡村的改变。',
    metric: '423 份成果',
    children: [
      { name: '实践成果', path: '/practice', desc: '全国团队的成果长廊' },
      { name: '我的实践', path: '/practice/mine', desc: '三阶段实践智能体工作台' },
    ],
  },
  {
    id: 'voice', name: '乡村之声', icon: '📢', path: '/voice', enabled: true, desc: '乡村出题，青年回应',
    hook: '乡镇发布真实需求，高校团队精准响应；乡村提问，青年作答。',
    metric: '89 条需求待响应',
  },
  {
    id: 'guide', name: '实践攻略', icon: '🧭', path: '/guide', enabled: true, desc: '从行前到成果，一本通关',
    hook: '行前准备、调研工具、报告模板、安全保障，一站式带你完成下乡。',
    metric: '全流程攻略',
  },
  {
    id: 'goods', name: '乡村好物', icon: '🛒', path: '/goods', enabled: true, desc: '每件好物背后都有一个村庄',
    hook: '农副产品、手工艺、非遗与文创，以消费帮扶助力乡村振兴。',
    metric: '8 件演示好物',
  },
  {
    id: 'about', name: '关于我们', icon: '🤝', path: '/about', enabled: true, desc: '青年与乡村的桥梁',
    hook: '数字技术架起青年与乡村的桥梁，认识数乡计划背后的团队与愿景。',
    metric: '了解我们',
  },
]
