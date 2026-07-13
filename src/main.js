import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import { fetchMapConfig } from './modules/builder/editor/map3d/mapConfig.js'

async function boot() {
  await fetchMapConfig()
  createApp(App).use(router).mount('#app')
}

boot()
