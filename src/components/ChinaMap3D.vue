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
  for (const f of gj.features || []) {
    const p = f.properties || {}
    if (p.name && p.adcode != null) nameToAdcode[p.name] = String(p.adcode)
  }
  const pts = toScatterPoints(filterByRegion(props.villages, cur))
  chart.setOption({
    backgroundColor: T.bg,
    geo3D: {
      map: mapName,
      roam: true,
      itemStyle: { color: T.regionBottom, borderColor: T.border, borderWidth: 1 },
      emphasis: { itemStyle: { color: T.regionTop } },
      regionHeight: 3,
      light: { main: { intensity: 1.2 }, ambient: { intensity: 0.3 } },
      viewControl: { distance: 120, alpha: 55 },
    },
    series: [
      {
        type: 'scatter3D',
        coordinateSystem: 'geo3D',
        data: pts,
        symbolSize: 10,
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
    else if (params.componentType === 'geo3D') handleRegionClick(params)
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
</style>
