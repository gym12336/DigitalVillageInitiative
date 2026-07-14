<template>
  <section v-if="items.length" class="card">
    <h3 class="card-title">🎯 关键指标</h3>
    <div class="kpi-grid">
      <div v-for="k in items" :key="k.name" class="kpi" :class="{ hi: k.isHighlight }">
        <span class="kpi-num">{{ k.value }}<i class="kpi-unit">{{ k.unit }}</i></span>
        <span class="kpi-label">{{ k.name }}</span>
        <span v-if="k.insight" class="kpi-insight">{{ k.insight }}</span>
      </div>
    </div>
  </section>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
})
</script>

<style scoped>
.card {
  padding: 1.4rem 1.5rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.card-title { margin: 0 0 1rem; font-size: 1.05rem; color: var(--color-primary-dark); }
.kpi-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: .8rem; }
.kpi {
  display: flex; flex-direction: column; gap: .3rem; padding: 1rem .8rem; text-align: center;
  background: var(--color-bg); border-radius: 12px;
}
.kpi.hi { background: var(--color-accent); box-shadow: inset 0 0 0 1px var(--color-primary); }
.kpi-num { font-size: 1.6rem; font-weight: 700; color: var(--color-primary-dark); }
.kpi-unit { font-size: .85rem; font-weight: 500; font-style: normal; color: var(--color-text-light); margin-left: 2px; }
.kpi-label { font-size: .8rem; color: var(--color-text-secondary); }
.kpi-insight { font-size: .72rem; color: var(--color-primary-dark); line-height: 1.4; margin-top: .25rem; }
</style>
