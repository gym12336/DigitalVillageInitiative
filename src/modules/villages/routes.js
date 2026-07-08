import VillageListView from './VillageListView.vue'
import VillageDetailView from './VillageDetailView.vue'
import HonorsView from './HonorsView.vue'
import GalleryView from './GalleryView.vue'
import TagsView from './TagsView.vue'

export default [
  { path: '/villages', name: 'village-list', component: VillageListView },
  // 三个横向页放在 :id 动态段之前，避免 honors/gallery/tags 被当作村 id 捕获
  { path: '/villages/honors', name: 'village-honors', component: HonorsView },
  { path: '/villages/gallery', name: 'village-gallery', component: GalleryView },
  { path: '/villages/tags', name: 'village-tags', component: TagsView },
  { path: '/villages/:id', name: 'village-detail', component: VillageDetailView },
]
