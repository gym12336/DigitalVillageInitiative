<template>
  <router-link class="v-card" :to="`/villages/${village.id}`">
    <div class="cover" :style="coverStyle">
      <span v-if="!village.cover" class="ph">{{ village.name.slice(0, 1) }}</span>
    </div>
    <div class="body">
      <div class="name">{{ village.name }}</div>
      <div class="meta">{{ village.fullName }}</div>
      <div class="tags"><span class="tag">{{ village.type }}</span><span class="tag">{{ village.status }}</span></div>
      <p class="summary">{{ village.summary }}</p>
    </div>
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ village: { type: Object, required: true } })
const coverStyle = computed(() =>
  props.village.cover ? { backgroundImage: `url(${props.village.cover})` } : {}
)
</script>

<style scoped>
.v-card {
  display: block; border: 1px solid var(--sx-line); border-radius: 14px; overflow: hidden;
  background: var(--sx-white); color: var(--sx-ink);
  box-shadow: 0 8px 24px rgba(32, 29, 22, 0.06);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.v-card:hover { transform: translateY(-4px); border-color: var(--sx-gold); box-shadow: var(--sx-shadow); }
.cover {
  height: 140px; background: linear-gradient(135deg, var(--sx-green), var(--sx-green-soft));
  background-size: cover; display: flex; align-items: center; justify-content: center;
}
.cover .ph { font-family: var(--sx-serif); font-size: 2.6rem; color: var(--sx-gold-bright); opacity: .7; }
.body { padding: 1rem; }
.name { font-family: var(--sx-serif); font-weight: 700; font-size: 1.15rem; color: var(--sx-green); }
.meta { font-size: .8rem; color: var(--sx-muted); }
.tags { margin: .5rem 0; }
.tag { font-size: .72rem; border: 1px solid var(--sx-line); border-radius: 999px; padding: .1rem .5rem; margin-right: .35rem; color: var(--sx-earth); }
.summary { font-size: .88rem; margin: 0; color: var(--sx-muted); }
</style>
