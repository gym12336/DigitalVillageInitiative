import VoiceView from './VoiceView.vue'
import VoiceDetailView from './VoiceDetailView.vue'

export default [
  { path: '/voice', name: 'voice', component: VoiceView },
  { path: '/voice/:id', name: 'voice-detail', component: VoiceDetailView },
]
