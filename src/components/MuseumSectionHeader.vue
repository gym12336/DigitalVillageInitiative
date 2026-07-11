<template>
  <header class="museum-section-head">
    <p><span>{{ index }}</span>{{ kicker }}</p>
    <div>
      <h2><AppIcon v-if="icon" :name="icon" :size="22" />{{ title }}</h2>
      <slot />
    </div>
  </header>
</template>

<script setup>
import AppIcon from '@/components/AppIcon.vue'
defineProps({
  index: { type: String, default: '01' },
  kicker: { type: String, default: 'FIELD COLLECTION' },
  title: { type: String, required: true },
  icon: { type: String, default: '' },
})
</script>

<style scoped>
.museum-section-head { display: grid; grid-template-columns: minmax(150px,.35fr) minmax(0,1fr); gap: 2rem; align-items: end; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-border); }
.museum-section-head > p { display: flex; gap: .8rem; color: var(--clay); font-family: var(--font-mono); font-size: 9px; letter-spacing: .13em; }
.museum-section-head > p span { color: var(--jade-deep); }
.museum-section-head h2 { display: flex; align-items: center; gap: .7rem; color: var(--jade-deep); font-size: clamp(1.45rem,3vw,2.35rem); }
.museum-section-head :deep(p) { margin-top: .5rem; color: var(--ink-soft); font-size: 14px; }
@media (max-width: 640px) { .museum-section-head { grid-template-columns: 1fr; gap: .7rem; } }
</style>
