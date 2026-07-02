<template>
  <section class="module-page">
    <header class="mod-hero">
      <p class="kicker">影像库</p>
      <h1>乡村影像记录</h1>
      <p class="lead">汇集各村照片与短视频素材（每村至少 30 张精选照片、10 段有效视频）。</p>
    </header>

    <div v-if="scopedVillage" class="scope-banner">
      只看 <b>{{ scopedVillage.name }}</b> 的影像
      <router-link class="scope-clear" to="/media">查看全部村庄 →</router-link>
    </div>

    <div class="media-grid">
      <article v-for="v in shownVillages" :key="v.id" class="media-card">
        <div class="thumb">
          <span class="thumb-ph">{{ v.name.slice(0, 1) }}</span>
        </div>
        <div class="media-body">
          <router-link class="media-village" :to="`/villages/${v.id}`">{{ v.name }}</router-link>
          <div class="media-stats">
            <span>📷 {{ countPhotos(v) }} 张</span>
            <span>🎬 {{ countVideos(v) }} 段</span>
          </div>
        </div>
      </article>
    </div>
    <p class="note">影像素材待实地采集后填充，命名遵循规范：日期_村名_小队_内容_拍摄者_编号。</p>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import villages from '@/data/villages.json'

const route = useRoute()
const scopedVillage = computed(() =>
  route.query.village ? villages.find((v) => v.id === route.query.village) || null : null
)
const shownVillages = computed(() => (scopedVillage.value ? [scopedVillage.value] : villages))

function countPhotos(v) {
  return (v.extra?.media || []).filter((m) => (typeof m === 'object' ? m.type === 'photo' : false)).length
}
function countVideos(v) {
  return (v.extra?.media || []).filter((m) => (typeof m === 'object' ? m.type === 'video' : false)).length
}
</script>

<style scoped>
.module-page { max-width: 1000px; margin: 0 auto; padding: 2.4rem clamp(1rem, 4vw, 2rem); }
.mod-hero { margin-bottom: 1.6rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--sx-gold); margin: 0 0 .5rem; }
.mod-hero h1 { font-size: clamp(34px, 5vw, 54px); color: var(--sx-green); }
.lead { color: var(--sx-muted); max-width: 640px; }
.media-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
.media-card {
  background: var(--sx-white); border: 1px solid var(--sx-line);
  border-radius: 14px; overflow: hidden;
}
.thumb {
  height: 120px; display: grid; place-items: center;
  background: linear-gradient(135deg, var(--sx-green), var(--sx-green-soft));
}
.thumb-ph { font-family: var(--sx-serif); font-size: 2.4rem; color: var(--sx-gold-bright); opacity: .7; }
.media-body { padding: .9rem; }
.media-village { font-family: var(--sx-serif); font-weight: 700; color: var(--sx-green); }
.media-stats { display: flex; gap: 1rem; margin-top: .4rem; font-size: .82rem; color: var(--sx-muted); }
.note { margin-top: 1.6rem; color: var(--sx-muted); font-size: .85rem; font-style: italic; }
.scope-banner {
  display: flex; align-items: center; gap: .6rem; flex-wrap: wrap;
  padding: .7rem 1rem; margin-bottom: 1.4rem;
  background: var(--sx-paper-deep); border: 1px solid var(--sx-line); border-radius: 10px;
  color: var(--sx-ink); font-size: .9rem;
}
.scope-clear { margin-left: auto; color: var(--sx-earth); font-size: .85rem; }
</style>
