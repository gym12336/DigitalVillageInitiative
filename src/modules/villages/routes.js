import VillageListView from './VillageListView.vue'
import VillageDetailView from './VillageDetailView.vue'

export default [
  { path: '/villages', name: 'village-list', component: VillageListView },
  { path: '/villages/:id', name: 'village-detail', component: VillageDetailView },
]
