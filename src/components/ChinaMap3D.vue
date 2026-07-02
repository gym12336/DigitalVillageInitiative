<template>
  <div class="map3d">
    <nav class="breadcrumb">
      <span
        v-for="(name, i) in crumbs"
        :key="i"
        class="crumb"
        :class="{ active: i === crumbs.length - 1 }"
        @click="goToDepth(i)"
      >{{ name }}<em v-if="i < crumbs.length - 1"> / </em></span>
    </nav>
    <div v-if="loadError" class="map-error">地图数据加载失败，已停留在当前层级。</div>
    <div ref="chartEl" class="chart"></div>
    <div v-if="subRegions.length" class="drill-bar">
      <span class="hint">{{ canDrillNow ? '点击下钻：' : '已到区县级（末级）' }}</span>
      <button
        v-for="r in subRegions"
        :key="r.adcode"
        class="drill-btn"
        :disabled="!canDrillNow"
        @click="enterRegion(r)"
      >{{ r.name }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import 'echarts-gl'
import { createDrill, drillDown, goToDepth as _goToDepth, current, breadcrumb, canDrill } from '@/lib/mapDrill.js'
import { createGeoLoader } from '@/lib/geoLoader.js'
import { toScatterPoints, filterByRegion } from '@/lib/villages.js'
import { earthGold as T } from '@/assets/theme/earth-gold.js'

const props = defineProps({ villages: { type: Array, default: () => [] } })
const emit = defineEmits(['select-village'])

const chartEl = ref(null)
const crumbs = ref(['全国'])
const loadError = ref(false)
const subRegions = ref([])   // 当前层级的子区域列表（下钻按钮用）
const canDrillNow = ref(true)
let chart = null
let drill = createDrill()
const geo = createGeoLoader({ onError: () => { loadError.value = true } })
let nameToAdcode = {}

function syncCrumbs() { crumbs.value = breadcrumb(drill) }

async function renderMap() {
  const cur = current(drill)
  const mapName = cur.name
  const gj = await geo.load(cur.adcode)
  if (!gj) return
  loadError.value = false
  echarts.registerMap(mapName, gj)
  nameToAdcode = {}
  const regions = []
  for (const f of gj.features || []) {
    const p = f.properties || {}
    if (p.name && p.adcode != null) {
      const adcode = String(p.adcode)
      nameToAdcode[p.name] = adcode
      regions.push({ name: p.name, adcode })
    }
  }
  // 更新下钻按钮：若已到末级则禁用
  canDrillNow.value = canDrill(drill)
  subRegions.value = regions
  const pts = toScatterPoints(filterByRegion(props.villages, cur))
  chart.setOption({
    backgroundColor: T.bg,
    tooltip: { show: true },
    series: [
      {
        type: 'map3D',
        map: mapName,
        roam: true,
        itemStyle: { color: T.regionBottom, borderColor: T.border, borderWidth: 1 },
        emphasis: { label: { show: true, color: T.text }, itemStyle: { color: T.regionTop } },
        regionHeight: 3,
        light: { main: { intensity: 1.2 }, ambient: { intensity: 0.3 } },
        viewControl: { distance: 120, alpha: 55 },
      },
      {
        type: 'scatter3D',
        coordinateSystem: 'geo3D',
        data: pts,
        symbolSize: 12,
        itemStyle: { color: T.scatter, opacity: 1 },
        emphasis: { itemStyle: { color: T.scatterGlow } },
        label: { show: false, formatter: (p) => p.name },
      },
    ],
  }, true)
}

async function enterRegion(target) {
  if (!canDrill(drill)) return
  drill = drillDown(drill, target)
  syncCrumbs()
  await renderMap()
}

async function goToDepth(depth) {
  drill = _goToDepth(drill, depth)
  syncCrumbs()
  await renderMap()
}

function handleRegionClick(params) {
  const adcode = nameToAdcode[params.name]
  if (adcode) enterRegion({ adcode, name: params.name })
}

function handleVillageClick(params) {
  const id = params?.data?.id
  if (id) emit('select-village', id)
}

onMounted(async () => {
  chart = echarts.init(chartEl.value)
  chart.on('click', (params) => {
    if (params.seriesType === 'scatter3D') handleVillageClick(params)
    else if (params.seriesType === 'map3D') handleRegionClick(params)
  })
  syncCrumbs()
  await renderMap()
})

onBeforeUnmount(() => { if (chart) chart.dispose() })
watch(() => props.villages, renderMap)

defineExpose({ enterRegion, goToDepth, handleVillageClick })
</script>

<style scoped>
.map3d { position: relative; }
.chart { width: 100%; height: 62vh; min-height: 380px; }
.breadcrumb { padding: 0.6rem 1rem; font-size: 0.95rem; }
.crumb { cursor: pointer; color: var(--sx-text-dim); }
.crumb.active { color: var(--sx-gold-soft); cursor: default; }
.crumb em { color: var(--sx-text-dim); font-style: normal; }
.map-error {
  position: absolute; top: 3rem; left: 50%; transform: translateX(-50%);
  padding: 0.5rem 1rem; background: var(--sx-bg-soft);
  border: 1px solid var(--sx-gold); border-radius: 6px; z-index: 2;
}
.drill-bar {
  display: flex; flex-wrap: wrap; gap: .5rem; align-items: center;
  padding: .7rem 1rem;
}
.drill-bar .hint { color: var(--sx-text-dim); font-size: .85rem; margin-right: .3rem; }
.drill-btn {
  padding: .3rem .8rem; font-size: .85rem; cursor: pointer;
  background: var(--sx-bg-soft); color: var(--sx-gold-soft);
  border: 1px solid var(--sx-border); border-radius: 6px;
  transition: border-color .15s, background .15s;
}
.drill-btn:hover:not(:disabled) { border-color: var(--sx-gold); background: #33260f; }
.drill-btn:disabled { opacity: .4; cursor: default; color: var(--sx-text-dim); }
</style>
