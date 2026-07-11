<template>
  <div class="museum-state" :class="type" role="status">
    <AppIcon :name="stateIcon" :size="28" />
    <div>
      <strong>{{ title }}</strong>
      <p v-if="description">{{ description }}</p>
      <slot />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
const props = defineProps({
  type: { type: String, default: 'empty' },
  title: { type: String, required: true },
  description: { type: String, default: '' },
})
const stateIcon = computed(() => ({ loading: 'museum', error: 'alert', empty: 'archive' }[props.type] || 'archive'))
</script>

<style scoped>
.museum-state { display: flex; align-items: flex-start; justify-content: center; gap: 1rem; min-height: 150px; padding: 2.3rem; color: var(--ink-soft); border: 1px dashed var(--color-border); background: rgba(250,247,240,.7); text-align: left; }
.museum-state > .app-icon { color: var(--jade); }
.museum-state.error > .app-icon { color: var(--clay); }
.museum-state strong { color: var(--jade-deep); font-family: var(--font-display); font-size: 1.05rem; }
.museum-state p { max-width: 560px; margin-top: .35rem; font-size: 13px; line-height: 1.7; }
</style>
