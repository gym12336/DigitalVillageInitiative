<template>
  <section v-if="items.length" class="card">
    <h3 class="card-title">👥 人物故事墙</h3>
    <div class="people-wall">
      <article v-for="(p, i) in items" :key="i" class="person">
        <div class="person-avatar" :style="{ background: avatarColor(i) }">{{ initial(p.name) }}</div>
        <p class="person-name">{{ p.name }}<span v-if="p.role" class="person-role">· {{ p.role }}</span></p>
        <span v-if="p.highlight" class="person-tag">{{ p.highlight }}</span>
        <p v-if="p.story" class="person-story">{{ p.story }}</p>
        <p v-else-if="p.quote" class="person-quote">"{{ p.quote }}"</p>
      </article>
    </div>
  </section>
</template>

<script setup>
defineProps({
  items: { type: Array, default: () => [] },
})

const AVATAR_COLORS = ['#6b8c5c', '#c9a86a', '#4a8fbf', '#e07a5f', '#8a9a5b', '#b07d62']
function avatarColor(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length] }
function initial(name) { return String(name || '?').trim().slice(0, 1) }
</script>

<style scoped>
.card {
  padding: 1.4rem 1.5rem; background: var(--color-card);
  border: 1px solid var(--color-border); border-radius: var(--radius); box-shadow: var(--shadow-card);
}
.card-title { margin: 0 0 1rem; font-size: 1.05rem; color: var(--color-primary-dark); }
.people-wall { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: .9rem; }
.person { display: flex; flex-direction: column; align-items: center; gap: .4rem; padding: 1rem .6rem; text-align: center; background: var(--color-bg); border-radius: 12px; }
.person-avatar { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 50%; color: #fff; font-size: 1.1rem; font-weight: 700; }
.person-name { margin: 0; font-size: .88rem; font-weight: 600; color: var(--color-text); }
.person-role { font-weight: 400; color: var(--color-text-light); }
.person-quote { margin: 0; font-size: .8rem; color: var(--color-text-secondary); line-height: 1.5; }
.person-story { margin: .2rem 0 0; font-size: .78rem; color: var(--color-text-secondary); line-height: 1.5; text-align: left; }
.person-tag { font-size: .68rem; color: #fff; background: var(--color-primary); padding: .1rem .5rem; border-radius: 50px; }
</style>
