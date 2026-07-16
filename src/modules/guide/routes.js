import GuideView from './GuideView.vue'
import GuideDetailView from './GuideDetailView.vue'

export default [
  { path: '/guide', name: 'guide', component: GuideView },
  { path: '/guide/:slug', name: 'guide-detail', component: GuideDetailView },
]
