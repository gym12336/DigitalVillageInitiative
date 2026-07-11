// src/modules/builder/routes.js
import BuilderHub from './BuilderHub.vue'
import BigComponentEditor from './editor/BigComponentEditor.vue'
import DisplayWorkbench from './display/DisplayWorkbench.vue'

export default [
  { path: '/builder', name: 'builder', component: BuilderHub },
  { path: '/builder/editor', name: 'builder-editor', component: BigComponentEditor },
  { path: '/builder/display', name: 'builder-display', component: DisplayWorkbench },
  // 带实践档案上下文的别名路由
  { path: '/builder/editor/:dossierId', name: 'builder-editor-dossier', component: BigComponentEditor },
  { path: '/builder/display/:dossierId', name: 'builder-display-dossier', component: DisplayWorkbench },
]
