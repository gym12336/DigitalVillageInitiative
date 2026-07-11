<template>
  <section class="gallery-page museum-public-page">
    <MuseumPageHero
      archive-no="IMAGE ARCHIVE · GALLERY"
      kicker="乡村百科 / 影像长廊"
      title="每一帧乡土影像，都是可以追溯的田野证据"
      description="汇集村庄实景与调研影像，点击图片进入对应数字村志。正式素材将附采集时间、地点、作者与授权状态。"
      icon="image"
      :metric="photos.length"
      metric-label="帧当前影像"
      demo
    />
    <div class="museum-content-shell">

      <!-- 按村筛选 -->
      <MuseumFilterBar title="VILLAGE FILTER / 按村庄筛选">
      <div class="chips" role="tablist" aria-label="按村筛选">
        <button class="museum-chip" :class="{ active: villageId === '全部' }" @click="villageId = '全部'">全部</button>
        <button
          v-for="v in villages"
          :key="v.id"
          class="museum-chip"
          :class="{ active: villageId === v.id }"
          @click="villageId = v.id"
        >{{ v.name }}</button>
      </div>
      </MuseumFilterBar>

      <!-- 图墙 -->
      <div v-if="photos.length" class="wall">
        <router-link
          v-for="(p, i) in photos"
          :key="i"
          class="shot"
          :to="`/villages/${p.villageId}`"
        >
          <img :src="p.src" :alt="p.villageName" loading="lazy" @error="onErr($event)" />
          <div class="shot-overlay">
            <span class="shot-village">{{ p.villageName }}</span>
            <span class="shot-summary">{{ p.summary }}</span>
          </div>
        </router-link>
      </div>
      <MuseumState v-else-if="error" type="error" title="影像档案载入失败" :description="`${error}，请刷新重试。`" />
      <MuseumState v-else type="loading" title="正在读取影像档案" description="图片较多时可能需要短暂等待。" />
    </div>
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { fetchAllVillages } from '@/api/villages.js'
import MuseumPageHero from '@/components/MuseumPageHero.vue'
import MuseumFilterBar from '@/components/MuseumFilterBar.vue'
import MuseumState from '@/components/MuseumState.vue'

const villages = ref([])
const loading = ref(true)
const error = ref('')

onMounted(async () => {
  try {
    villages.value = await fetchAllVillages()
  } catch (e) {
    error.value = e.message || '加载失败'
  } finally {
    loading.value = false
  }
})

const villageId = ref('全部')

// 聚合各村 gallery 图（缺省用 cover 兜底），带上村信息
const photos = computed(() => {
  const source = villageId.value === '全部'
    ? villages.value
    : villages.value.filter((v) => v.id === villageId.value)
  return source.flatMap((v) => {
    const imgs = (v.gallery && v.gallery.length ? v.gallery : [v.cover]).filter(Boolean)
    return imgs.map((src) => ({ src, villageId: v.id, villageName: v.name, summary: v.summary }))
  })
})

function onErr(e) {
  const shot = e.target.closest('.shot')
  if (shot) shot.classList.add('shot-fallback')
}
</script>

<style scoped>
.gallery-page { padding: 0; }
.page-head { margin-bottom: 1.6rem; }
.kicker { font-size: 13px; font-weight: 700; color: var(--color-highlight); letter-spacing: .08em; margin: 0 0 .6rem; }
.page-head h1 { font-size: clamp(28px, 4vw, 38px); font-weight: 700; color: var(--color-primary-dark); font-family: var(--sx-serif); }
.desc { max-width: 640px; margin: .8rem 0 0; color: var(--color-text-secondary); }

.chips { display: flex; flex-wrap: wrap; gap: .55rem; }
.chip { padding: .4rem 1rem; border: 1px solid var(--color-border); border-radius: 50px; background: var(--color-card); color: var(--color-text-secondary); font-size: .85rem; cursor: pointer; transition: all var(--transition); }
.chip:hover { border-color: var(--color-primary); color: var(--color-primary); }
.chip.active { background: var(--color-primary); border-color: var(--color-primary); color: #fff; }

.wall {
  margin-top: 1.6rem;
  columns: 4 240px;
  column-gap: 1rem;
}
.shot {
  position: relative; display: block; break-inside: avoid;
  margin-bottom: 1rem; border-radius: var(--radius-sm); overflow: hidden;
  box-shadow: var(--shadow-card); background: linear-gradient(135deg, var(--color-primary-dark), var(--color-primary-soft));
}
.shot img { width: 100%; display: block; transition: transform var(--transition-slow); }
.shot.shot-fallback img { visibility: hidden; min-height: 180px; }
.shot:hover img { transform: scale(1.05); }
.shot-overlay {
  position: absolute; left: 0; right: 0; bottom: 0;
  padding: 1.4rem .9rem .8rem; color: #fff;
  background: linear-gradient(transparent, rgba(0, 0, 0, .65));
  opacity: 0; transition: opacity var(--transition);
  display: flex; flex-direction: column; gap: .2rem;
}
.shot:hover .shot-overlay { opacity: 1; }
.shot-village { font-family: var(--sx-serif); font-weight: 700; font-size: 1rem; }
.shot-summary { font-size: .78rem; opacity: .9; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.empty { padding: 2.5rem; text-align: center; color: var(--color-text-light); background: var(--color-card); border: 1px dashed var(--color-border); border-radius: var(--radius); }
</style>
