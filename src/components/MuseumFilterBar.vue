<template>
  <section class="museum-filter-bar" :aria-label="label">
    <div v-if="title || $slots.header" class="filter-bar-head">
      <slot name="header"><span>{{ title }}</span></slot>
    </div>
    <div class="filter-bar-main"><slot /></div>
    <div v-if="$slots.footer" class="filter-bar-footer"><slot name="footer" /></div>
  </section>
</template>

<script setup>
defineProps({
  label: { type: String, default: '筛选条件' },
  title: { type: String, default: '' },
})
</script>

<style scoped>
.museum-filter-bar { border: 1px solid var(--color-border); background: rgba(250,247,240,.84); box-shadow: var(--shadow-sm); }
.filter-bar-head { padding: .8rem 1rem; color: var(--clay); border-bottom: 1px solid var(--color-border-light); font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: .13em; }
.filter-bar-main { padding: 1rem; }
.filter-bar-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: .7rem 1rem; color: var(--ink-faint); border-top: 1px solid var(--color-border-light); font-size: 12px; }
</style>
