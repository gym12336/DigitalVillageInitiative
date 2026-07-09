// src/modules/builder/routes.js
import BuilderHub from './BuilderHub.vue'
import BigComponentEditor from './editor/BigComponentEditor.vue'
import DisplayWorkbench from './display/DisplayWorkbench.vue'

export default [
  { path: '/builder', name: 'builder', component: BuilderHub },
  { path: '/builder/editor', name: 'builder-editor', component: BigComponentEditor },
  { path: '/builder/display', name: 'builder-display', component: DisplayWorkbench },
]
