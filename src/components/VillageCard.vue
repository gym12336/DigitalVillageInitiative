<template>
  <router-link class="v-card" :to="`/villages/${village.id}`">
    <div class="cover">
      <img v-if="village.cover && !imgFailed" :src="village.cover" :alt="village.name" loading="lazy" @error="imgFailed = true" />
      <span v-else class="ph">{{ village.name.slice(0, 1) }}</span>
      <span v-if="topHonor" class="honor">{{ topHonor }}</span>
    </div>
    <div class="body">
      <div class="name">{{ village.name }}</div>
      <div class="meta">{{ village.fullName }}</div>
      <div class="tags"><span class="tag">{{ village.type || village.province }}</span><span class="tag">{{ village.status || village.city }}</span></div>
      <p class="summary">{{ village.summary }}</p>
      <p v-if="village.certLabel" class="cert" :class="certClass">✓ {{ village.certLabel }}</p>
    </div>
  </router-link>
</template>

<script setup>
import { computed, ref } from 'vue'
const props = defineProps({ village: { type: Object, required: true } })

const imgFailed = ref(false)
const topHonor = computed(() => (props.village.honors && props.village.honors[0]) || '')
const certClass = computed(() => {
  const lvl = props.village.certLevel
  return lvl === 'province' ? 'cert-province' : lvl === 'county' ? 'cert-county' : 'cert-township'
})
</script>

<style scoped>
.v-card {
  display: block; border: 1px solid var(--sx-line); border-radius: 14px; overflow: hidden;
  background: var(--sx-white); color: var(--sx-ink);
  box-shadow: 0 8px 24px rgba(32, 29, 22, 0.06);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease;
}
.v-card:hover { transform: translateY(-6px); border-color: var(--sx-gold); box-shadow: var(--sx-shadow); }
.cover {
  position: relative; height: 180px;
  background: linear-gradient(135deg, var(--sx-green), var(--sx-green-soft));
  display: flex; align-items: center; justify-content: center; overflow: hidden;
}
.cover img { width: 100%; height: 100%; object-fit: cover; }
.cover .ph { font-family: var(--sx-serif); font-size: 3rem; color: var(--sx-gold-bright); opacity: .8; }
.honor {
  position: absolute; left: .6rem; top: .6rem; padding: .15rem .6rem; border-radius: 50px;
  background: var(--sx-gold); color: var(--sx-green); font-size: .7rem; font-weight: 700;
}
.body { padding: 1rem 1.1rem 1.1rem; }
.name { font-family: var(--sx-serif); font-weight: 700; font-size: 1.15rem; color: var(--sx-green); }
.meta { font-size: .78rem; color: var(--sx-muted); margin-top: .2rem; }
.tags { margin: .5rem 0; display: flex; flex-wrap: wrap; gap: .35rem; }
.tag { font-size: .72rem; border: 1px solid var(--sx-line); border-radius: 999px; padding: .1rem .6rem; color: var(--sx-earth); }
.summary { font-size: .88rem; margin: 0 0 .5rem; color: var(--sx-muted); }
.cert { margin: 0; font-size: .78rem; font-weight: 600; }
.cert-township { color: var(--color-primary); }
.cert-county { color: #4a8fbf; }
.cert-province { color: var(--color-secondary); }
</style>
