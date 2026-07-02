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
.v-card { display: block; border: 1px solid var(--sx-border); border-radius: 10px; overflow: hidden; background: var(--sx-bg-soft); color: var(--sx-text); }
.v-card:hover { border-color: var(--sx-gold); }
.cover { height: 130px; background: linear-gradient(135deg, #2a1f14, #120c06); background-size: cover; display: flex; align-items: center; justify-content: center; }
.cover .ph { font-size: 2.4rem; color: var(--sx-gold); opacity: .5; }
.body { padding: .8rem; }
.name { font-weight: 600; color: var(--sx-gold-soft); }
.meta { font-size: .8rem; color: var(--sx-text-dim); }
.tags { margin: .4rem 0; }
.tag { font-size: .72rem; border: 1px solid var(--sx-border); border-radius: 4px; padding: .1rem .4rem; margin-right: .3rem; color: var(--sx-text-dim); }
.summary { font-size: .85rem; margin: 0; }
</style>
