<template>
  <router-link class="v-card" :to="`/villages/${village.id}`">
    <div class="cover">
      <img
        v-if="village.cover && !imgFailed"
        :src="village.cover"
        :alt="village.name"
        loading="lazy"
        @error="imgFailed = true"
      />
      <span v-else class="ph">{{ village.name.slice(0, 1) }}</span>
      <span v-if="topHonor" class="honor">{{ topHonor }}</span>
    </div>
    <div class="body">
      <div class="name">{{ village.name }}</div>
      <div class="meta">{{ village.fullName }}</div>
      <div class="tags">
        <span class="tag">{{ village.type || village.province }}</span>
        <span class="tag">{{ village.status || village.city }}</span>
      </div>
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
  display: block;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  background: var(--color-card);
  color: var(--color-text);
  box-shadow: var(--shadow-card);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    border-color var(--transition-fast);
}
.v-card:hover {
  transform: translateY(-6px);
  border-color: var(--color-primary);
  box-shadow: var(--shadow-card-hover);
}
.cover {
  position: relative;
  height: 200px;
  background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-soft));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--transition-slow);
}
.v-card:hover .cover img { transform: scale(1.04); }
.cover .ph {
  font-family: var(--sx-serif);
  font-size: 3.2rem;
  color: var(--color-accent);
  opacity: .85;
}
.honor {
  position: absolute;
  left: .7rem;
  top: .7rem;
  padding: .2rem .7rem;
  border-radius: var(--radius-full);
  background: rgba(232, 201, 155, .92);
  color: var(--color-primary-dark);
  font-size: .72rem;
  font-weight: 700;
  backdrop-filter: blur(4px);
}
.body { padding: 1.1rem 1.2rem 1.2rem; }
.name {
  font-family: var(--sx-serif);
  font-weight: 700;
  font-size: 1.2rem;
  color: var(--color-primary-dark);
}
.meta {
  font-size: .8rem;
  color: var(--color-text-secondary);
  margin-top: .25rem;
}
.tags {
  margin: .55rem 0;
  display: flex;
  flex-wrap: wrap;
  gap: .4rem;
}
.tag {
  font-size: .74rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  padding: .12rem .7rem;
  color: var(--color-secondary);
  font-weight: 500;
}
.summary {
  font-size: .88rem;
  margin: 0 0 .5rem;
  color: var(--color-text-secondary);
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.cert {
  margin: 0;
  font-size: .78rem;
  font-weight: 600;
}
.cert-township { color: var(--color-primary); }
.cert-county { color: #4a8fbf; }
.cert-province { color: var(--color-secondary); }
</style>
