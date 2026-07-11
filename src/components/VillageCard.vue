<template>
  <router-link class="v-card" :to="`/villages/${village.id}`">
    <div class="cover">
      <img v-if="village.cover && !imgFailed" :src="village.cover" :alt="village.name" loading="lazy" @error="imgFailed = true" />
      <span v-else class="ph">{{ village.name.slice(0, 1) }}</span>
      <div class="cover-grid" aria-hidden="true" />
      <span class="archive-no">ARCHIVE · {{ archiveNo }}</span>
      <span v-if="topHonor" class="honor">{{ topHonor }}</span>
      <span class="open-mark"><AppIcon name="arrow-right" :size="17" /></span>
    </div>
    <div class="body">
      <div class="title-row">
        <div>
          <div class="name">{{ village.name }}</div>
          <div class="meta">{{ village.province }} · {{ village.city }}</div>
        </div>
        <span class="status-dot"><i /> {{ village.status || '已建档' }}</span>
      </div>
      <p class="summary">{{ village.summary }}</p>
      <div class="record-row">
        <span v-if="village.coord?.length">{{ village.coord[1] }}°N · {{ village.coord[0] }}°E</span>
        <span v-else>{{ village.fullName }}</span>
      </div>
      <div class="tags">
        <span class="tag">{{ village.type || village.province }}</span>
        <span v-if="village.certLabel" class="cert" :class="certClass">{{ village.certLabel }}</span>
      </div>
    </div>
  </router-link>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({ village: { type: Object, required: true } })
const imgFailed = ref(false)
const topHonor = computed(() => (props.village.honors && props.village.honors[0]) || '')
const archiveNo = computed(() => `CN-${String(props.village.id || '000').toUpperCase().slice(0, 10)}`)
const certClass = computed(() => {
  const lvl = props.village.certLevel
  return lvl === 'province' ? 'cert-province' : lvl === 'county' ? 'cert-county' : 'cert-township'
})
</script>

<style scoped>
.v-card { display: block; overflow: hidden; color: var(--ink); background: var(--paper-light); border: 1px solid var(--color-border); transition: border-color var(--transition), box-shadow var(--transition); }
.v-card:hover { color: var(--ink); border-color: var(--bronze); box-shadow: var(--shadow-card-hover); }
.cover { position: relative; height: 230px; display: flex; align-items: center; justify-content: center; overflow: hidden; background: var(--museum-panel); }
.cover::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg,rgba(7,17,15,.08),rgba(7,17,15,.7)); }
.cover img { width: 100%; height: 100%; object-fit: cover; filter: saturate(.78) contrast(1.04); transition: transform var(--transition-slow), filter var(--transition); }
.v-card:hover .cover img { transform: scale(1.035); filter: saturate(.95) contrast(1.04); }
.cover-grid { position: absolute; inset: 0; z-index: 1; opacity: .24; background-image: linear-gradient(rgba(151,196,177,.35) 1px,transparent 1px),linear-gradient(90deg,rgba(151,196,177,.35) 1px,transparent 1px); background-size: 34px 34px; mix-blend-mode: screen; }
.ph { color: var(--bronze-light); font-family: var(--font-accent); font-size: 4rem; }
.archive-no { position: absolute; z-index: 2; top: 14px; left: 14px; color: rgba(255,255,255,.72); font-family: var(--font-mono); font-size: 8px; letter-spacing: .12em; }
.honor { position: absolute; z-index: 2; right: 14px; bottom: 14px; max-width: calc(100% - 80px); padding: 4px 7px; color: var(--museum-black); background: var(--bronze-light); font-size: 9px; font-weight: 700; }
.open-mark { position: absolute; z-index: 2; bottom: 14px; left: 14px; display: grid; place-items: center; width: 31px; height: 31px; color: var(--data-glow); border: 1px solid rgba(118,216,188,.55); transition: background var(--transition-fast), color var(--transition-fast); }
.v-card:hover .open-mark { color: var(--museum-black); background: var(--data-glow); }
.body { padding: 1.25rem 1.25rem 1.15rem; }
.title-row { display: flex; align-items: start; justify-content: space-between; gap: 1rem; }
.name { color: var(--jade-deep); font-family: var(--font-display); font-size: 1.35rem; font-weight: 700; }
.meta { margin-top: .2rem; color: var(--ink-faint); font-size: .75rem; }
.status-dot { display: inline-flex; align-items: center; gap: 5px; margin-top: 4px; color: var(--jade-deep); font-family: var(--font-mono); font-size: 8px; white-space: nowrap; }
.status-dot i { width: 5px; height: 5px; background: var(--jade); border-radius: 50%; }
.summary { min-height: 3.1em; margin: 1rem 0 .85rem; color: var(--ink-soft); font-size: .82rem; line-height: 1.65; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.record-row { padding: .65rem 0; color: var(--ink-faint); border-block: 1px solid var(--color-border-light); font-family: var(--font-mono); font-size: 8px; letter-spacing: .08em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tags { display: flex; align-items: center; justify-content: space-between; gap: .6rem; margin-top: .8rem; }
.tag, .cert { color: var(--clay); font-size: .7rem; font-weight: 600; }.cert { color: var(--jade-deep); text-align: right; }
.cert-county { color: #487c92; }.cert-province { color: #8c6b32; }
</style>
