<template>
  <section v-if="items.length" class="card">
    <h3 class="card-title">📊 帮扶前后对比</h3>
    <div class="cmp-list">
      <div v-for="m in items" :key="m.name" class="cmp-row">
        <div class="cmp-head">
          <span class="cmp-name">{{ m.name }}</span>
          <span class="cmp-delta" :class="{ up: m.up, down: m.down }">{{ m.deltaLabel }}</span>
        </div>
        <p v-if="m.insight" class="cmp-insight">{{ m.insight }}</p>
        <div class="cmp-bars">
          <div class="bar-line">
            <span class="bar-tag">前</span>
            <div class="bar-track"><div class="bar before" :style="{ width: m.beforePct + '%' }" /></div>
            <span class="bar-val">{{ m.before }}{{ m.unit }}</span>
          </div>
          <div class="bar-line">
            <span class="bar-tag">后</span>
            <div class="bar-track"><div class="bar after" :style="{ width: m.afterPct + '%' }" /></div>
            <span class="bar-val">{{ m.after }}{{ m.unit }}</span>
          </div>
        </div>
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
.cmp-list { display: flex; flex-direction: column; gap: 1rem; }
.cmp-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: .4rem; }
.cmp-name { font-size: .9rem; font-weight: 600; color: var(--color-text); }
.cmp-delta { font-size: .8rem; color: var(--color-text-light); }
.cmp-delta.up { color: var(--color-primary); }
.cmp-delta.down { color: var(--color-highlight); }
.cmp-bars { display: flex; flex-direction: column; gap: .35rem; }
.bar-line { display: flex; align-items: center; gap: .5rem; }
.bar-tag { flex-shrink: 0; width: 1.4em; font-size: .75rem; color: var(--color-text-light); }
.bar-track { flex: 1; height: 12px; background: var(--color-bg); border-radius: 50px; overflow: hidden; }
.bar { height: 100%; border-radius: 50px; transition: width .5s ease; }
.bar.before { background: #cdd6c4; }
.bar.after { background: var(--color-primary); }
.bar-val { flex-shrink: 0; min-width: 3.5em; text-align: right; font-size: .78rem; color: var(--color-text-secondary); }
.cmp-insight { margin: 0 0 .5rem; font-size: .78rem; color: var(--color-primary-dark); line-height: 1.5; }
</style>
