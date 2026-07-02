<template>
  <aside class="info-card">
    <div v-if="!village" class="empty">
      <div class="empty-icon">🗺️</div>
      <p>点击地图上的村庄<br />查看资源信息</p>
    </div>

    <div v-else class="content">
      <div class="head">
        <router-link class="v-name" :to="`/villages/${village.id}`">{{ village.name }}</router-link>
        <div class="v-full">{{ village.fullName }}</div>
        <div class="v-tags">
          <span class="tag">{{ village.type }}</span>
          <span class="tag">{{ village.status }}</span>
        </div>
        <p class="v-summary">{{ village.summary }}</p>
      </div>

      <ul class="res-list">
        <router-link class="res-row" :to="`/ranking?village=${village.id}`">
          <span class="res-ico">🏆</span>
          <span class="res-label">特色资源</span>
          <span class="res-count">{{ s.resources }} 项</span>
          <span class="res-arrow">→</span>
        </router-link>
        <router-link class="res-row" :to="`/people?village=${village.id}`">
          <span class="res-ico">👤</span>
          <span class="res-label">人物故事</span>
          <span class="res-count">{{ s.people }} 位</span>
          <span class="res-arrow">→</span>
        </router-link>
        <router-link class="res-row" :to="`/media?village=${village.id}`">
          <span class="res-ico">🎬</span>
          <span class="res-label">影像素材</span>
          <span class="res-count">{{ s.photos }} 图 / {{ s.videos }} 视频</span>
          <span class="res-arrow">→</span>
        </router-link>
      </ul>

      <router-link class="enter-btn" :to="`/villages/${village.id}`">进入村庄主页 →</router-link>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { summarize } from '@/lib/villageResources.js'

const props = defineProps({ village: { type: Object, default: null } })
const s = computed(() => summarize(props.village || {}))
</script>

<style scoped>
.info-card {
  height: 100%; min-height: 320px; padding: 1.1rem;
  color: #dbeeff;
}
.empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6f9bc4; text-align: center; }
.empty-icon { font-size: 2.4rem; margin-bottom: .6rem; opacity: .7; }
.head { border-bottom: 1px solid rgba(63,143,214,.2); padding-bottom: .9rem; }
.v-name { font-family: var(--sx-serif); font-size: 1.4rem; font-weight: 700; color: #7fd0ff; }
.v-full { font-size: .8rem; color: #6f9bc4; margin-top: .2rem; }
.v-tags { margin: .5rem 0; }
.tag { font-size: .72rem; border: 1px solid rgba(63,143,214,.4); border-radius: 999px; padding: .1rem .55rem; margin-right: .35rem; color: #9fc8ec; }
.v-summary { font-size: .85rem; color: #b8d4ee; margin: .4rem 0 0; }
.res-list { list-style: none; padding: 0; margin: 1rem 0; display: flex; flex-direction: column; gap: .5rem; }
.res-row {
  display: flex; align-items: center; gap: .6rem;
  padding: .6rem .7rem; border-radius: 8px;
  background: rgba(26,74,122,.3); border: 1px solid rgba(63,143,214,.3);
  color: #dbeeff; transition: all .15s;
}
.res-row:hover { background: rgba(47,127,196,.45); border-color: #7fd0ff; box-shadow: 0 0 10px rgba(79,214,255,.3); }
.res-ico { font-size: 1.1rem; }
.res-label { flex: 1; font-size: .9rem; }
.res-count { font-size: .8rem; color: #9fc8ec; }
.res-arrow { color: #7fd0ff; }
.enter-btn {
  display: block; text-align: center; padding: .55rem;
  border: 1px solid #3f8fd6; border-radius: 8px; color: #b8f0ff;
  background: rgba(63,143,214,.15); transition: all .15s;
}
.enter-btn:hover { background: rgba(63,143,214,.35); box-shadow: 0 0 12px rgba(79,214,255,.35); }
</style>
