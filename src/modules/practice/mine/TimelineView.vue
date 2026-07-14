<template>
  <section v-if="items.length" class="card">
    <h3 class="card-title">🧭 实践足迹</h3>
    <ol class="timeline">
      <li v-for="(t, i) in items" :key="i" class="tl-item">
        <span class="tl-dot" />
        <div class="tl-body">
          <p class="tl-name">{{ t.name }}</p>
          <p v-if="t.event" class="tl-note">{{ t.event }}</p>
          <p v-else-if="t.note" class="tl-note">{{ t.note }}</p>
          <span v-if="t.theme" class="tl-type">{{ t.theme }}</span>
          <span v-if="t.date" class="tl-date">{{ t.date }}</span>
        </div>
      </li>
    </ol>
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
.timeline { list-style: none; margin: 0; padding: 0; }
.tl-item { position: relative; padding: 0 0 1rem 1.4rem; border-left: 2px solid var(--color-border); }
.tl-item:last-child { border-left-color: transparent; padding-bottom: 0; }
.tl-dot { position: absolute; left: -6px; top: 3px; width: 10px; height: 10px; border-radius: 50%; background: var(--color-primary); }
.tl-name { margin: 0; font-size: .9rem; font-weight: 600; color: var(--color-text); }
.tl-note { margin: .2rem 0; font-size: .82rem; color: var(--color-text-secondary); }
.tl-type { font-size: .72rem; color: var(--color-primary); background: var(--color-accent); padding: .1rem .5rem; border-radius: 50px; }
.tl-date { font-size: .72rem; color: var(--color-text-light); margin-left: .4rem; }
</style>
