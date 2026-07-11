<template>
  <aside class="info-card">
    <div v-if="!village" class="empty">
      <div class="empty-head">
        <div class="empty-icon"><AppIcon name="map-pin" :size="30" /></div>
        <p class="empty-tip">点击地图上的<b>铜金点位</b>查看村庄，<br />或从下方推荐开始探索</p>
      </div>
      <div v-if="recommended.length" class="recommend">
        <p class="rec-title">CURATOR'S PICKS / 推荐村庄</p>
        <button
          v-for="v in recommended"
          :key="v.id"
          class="rec-item"
          @click="emit('select-village', v.id)"
        >
          <span class="rec-name">{{ v.name }}</span>
          <span class="rec-loc">{{ v.province }}{{ v.city }}</span>
          <span class="rec-arrow">→</span>
        </button>
      </div>
    </div>

    <div v-else class="content">
      <div class="head">
        <router-link class="v-name" :to="`/villages/${village.id}`">{{ village.name }}</router-link>
        <div class="v-full">{{ village.fullName }}</div>
        <div class="v-tags">
          <span class="tag">{{ village.type }}</span>
          <span class="tag">{{ village.status }}</span>
        </div>
        <p class="v-summary">{{ village.summary }}</p>
      </div>

      <ul class="res-list">
        <router-link class="res-row" :to="`/ranking?village=${village.id}`">
          <span class="res-ico">01</span>
          <span class="res-label">特色资源</span>
          <span class="res-count">{{ s.resources }} 项</span>
          <span class="res-arrow">→</span>
        </router-link>
        <router-link class="res-row" :to="`/people?village=${village.id}`">
          <span class="res-ico">02</span>
          <span class="res-label">人物故事</span>
          <span class="res-count">{{ s.people }} 位</span>
          <span class="res-arrow">→</span>
        </router-link>
        <router-link class="res-row" :to="`/media?village=${village.id}`">
          <span class="res-ico">03</span>
          <span class="res-label">影像素材</span>
          <span class="res-count">{{ s.photos }} 图 / {{ s.videos }} 视频</span>
          <span class="res-arrow">→</span>
        </router-link>
      </ul>

      <router-link class="enter-btn" :to="`/villages/${village.id}`">进入村庄主页 →</router-link>
    </div>
  </aside>
</template>

<script setup>
import { computed } from 'vue'
import { summarize, recommendVillages } from '@/lib/villageResources.js'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  village: { type: Object, default: null },
  villages: { type: Array, default: () => [] },
})
const emit = defineEmits(['select-village'])
const s = computed(() => summarize(props.village || {}))
// 空状态推荐：按资源丰富度取前 4 个，引导用户开始探索
const recommended = computed(() => recommendVillages(props.villages, 4))
</script>

<style scoped>
.info-card {
  height: 100%; min-height: 320px; padding: 1.3rem;
  color: var(--color-text);
}
.empty { height: 100%; display: flex; flex-direction: column; gap: 1.2rem; }
.empty-head { text-align: center; color: var(--color-text-light); padding-top: 1.5rem; }
.empty-icon { display: grid; place-items: center; width: 52px; height: 52px; margin: 0 auto .8rem; color: var(--color-primary-dark); border: 1px solid var(--color-border); }
.empty-tip { font-size: .85rem; line-height: 1.6; }
.empty-tip b { color: var(--color-highlight); }
.recommend { display: flex; flex-direction: column; gap: .5rem; }
.rec-title { font-family: var(--font-mono); font-size: .58rem; font-weight: 600; letter-spacing: .1em; color: var(--color-primary-dark); margin: 0 0 .2rem; }
.rec-item {
  display: flex; align-items: center; gap: .5rem; width: 100%; text-align: left; cursor: pointer;
  padding: .6rem .7rem; border-radius: 0;
  background: var(--color-bg); border: 1px solid var(--color-border);
  color: var(--color-text); transition: all .15s; font-family: inherit;
}
.rec-item:hover { background: #f0ebe4; border-color: var(--color-primary); transform: translateX(2px); }
.rec-name { font-size: .9rem; font-weight: 600; }
.rec-loc { flex: 1; font-size: .75rem; color: var(--color-text-light); }
.rec-arrow { color: var(--color-primary); }
.head { border-bottom: 1px solid var(--color-border); padding-bottom: .9rem; }
.v-name { font-family: var(--sx-serif); font-size: 1.4rem; font-weight: 700; color: var(--color-primary); }
.v-full { font-size: .8rem; color: var(--color-text-light); margin-top: .2rem; }
.v-tags { margin: .5rem 0; }
.tag { font-size: .72rem; border: 1px solid var(--color-border); border-radius: 999px; padding: .1rem .55rem; margin-right: .35rem; color: var(--color-secondary); }
.v-summary { font-size: .85rem; color: var(--color-text-secondary); margin: .4rem 0 0; }
.res-list { list-style: none; padding: 0; margin: 1rem 0; display: flex; flex-direction: column; gap: .5rem; }
.res-row {
  display: flex; align-items: center; gap: .6rem;
  padding: .6rem .7rem; border-radius: 0;
  background: var(--color-bg); border: 1px solid var(--color-border);
  color: var(--color-text); transition: all .15s;
}
.res-row:hover { background: #f0ebe4; border-color: var(--color-primary); }
.res-ico { color: var(--color-secondary); font-family: var(--font-mono); font-size: .62rem; }
.res-label { flex: 1; font-size: .9rem; }
.res-count { font-size: .8rem; color: var(--color-text-light); }
.res-arrow { color: var(--color-primary); }
.enter-btn {
  display: block; text-align: center; padding: .6rem;
  border-radius: 0; color: #fff;
  background: var(--color-highlight); transition: all .15s; font-weight: 500;
}
.enter-btn:hover { filter: brightness(.94); }
</style>
