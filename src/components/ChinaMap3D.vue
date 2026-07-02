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
import { techBlue as T } from '@/assets/theme/tech-blue.js'

const props = defineProps({
  villages: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
})
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
      // 排除"当前区域自身"（末级回退到自身边界时，features 只含自己）
      if (adcode !== String(cur.adcode)) regions.push({ name: p.name, adcode })
    }
  }
  // 有真正的子区域、且未到末级，才允许下钻
  canDrillNow.value = canDrill(drill) && regions.length > 0
  subRegions.value = regions
  const pts = toScatterPoints(filterByRegion(props.villages, cur)).map((p) => {
    const on = p.id === props.selectedId
    return {
      ...p,
      symbolSize: on ? 22 : 13,
      itemStyle: { color: on ? T.scatterGlow : T.scatter, opacity: 1, borderColor: T.scatterGlow, borderWidth: on ? 2 : 1 },
      label: { show: on, formatter: p.name, color: T.text, fontSize: 13 },
    }
  })
  chart.setOption({
    backgroundColor: {
      type: 'radial', x: 0.5, y: 0.42, r: 0.75,
      colorStops: [
        { offset: 0, color: T.bgTop },
        { offset: 1, color: T.bg },
      ],
    },
    tooltip: {
      show: true, backgroundColor: 'rgba(10,26,47,.9)', borderColor: T.border, textStyle: { color: T.text },
      formatter: (p) => (p.seriesType === 'scatter3D' ? `📍 ${p.data.name}` : p.name),
    },
    geo3D: {
      map: mapName,
      roam: true,
      boxWidth: 100,
      boxDepth: 80,
      regionHeight: 2,
      itemStyle: { color: T.regionTop, borderColor: T.border, borderWidth: 1, opacity: 0.92 },
      emphasis: { label: { show: true, color: T.scatterGlow, fontSize: 14 }, itemStyle: { color: T.regionEmphasis, borderColor: T.borderEmphasis } },
      label: { show: false, color: T.textDim },
      shading: 'lambert',
      light: {
        main: { intensity: 1.2, alpha: 40, beta: 30 },
        ambient: { intensity: 0.6 },
      },
      viewControl: { alpha: 50, beta: 0, autoRotate: false, distance: 100, minDistance: 50, maxDistance: 180 },
      groundPlane: { show: false },
    },
    series: [
      {
        type: 'scatter3D',
        coordinateSystem: 'geo3D',
        data: pts,
        symbolSize: 13,
        itemStyle: { color: T.scatter, opacity: 1, borderColor: T.scatterGlow, borderWidth: 1 },
        emphasis: { itemStyle: { color: T.scatterGlow } },
        label: { show: false, color: T.text },
      },
    ],
  }, true)
}

async function enterRegion(target) {
  if (!canDrill(drill)) return
  // 先确认目标层级数据能加载，成功后才推进下钻栈，避免失败时面包屑/地图错位
  const gj = await geo.load(target.adcode)
  if (!gj) { loadError.value = true; return }
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

let resizeObs = null
onMounted(async () => {
  chart = echarts.init(chartEl.value)
  chart.on('click', (params) => {
    if (params.seriesType === 'scatter3D') handleVillageClick(params)
    else if (params.componentType === 'geo3D') handleRegionClick(params)
  })
  // 监听容器尺寸变化，保证 canvas 不撑破栅格（jsdom 无 ResizeObserver 时跳过）
  if (typeof ResizeObserver !== 'undefined') {
    resizeObs = new ResizeObserver(() => chart && chart.resize())
    resizeObs.observe(chartEl.value)
  }
  syncCrumbs()
  await renderMap()
})

onBeforeUnmount(() => {
  if (resizeObs) resizeObs.disconnect()
  if (chart) chart.dispose()
})
watch(() => props.villages, renderMap)
watch(() => props.selectedId, renderMap)

defineExpose({ enterRegion, goToDepth, handleVillageClick })
</script>

<style scoped>
.map3d {
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  background: linear-gradient(160deg, #0e2a4d, #0a1a2f 60%, #061223);
  border: 1px solid rgba(63, 143, 214, 0.35);
  box-shadow: 0 20px 60px rgba(6, 18, 35, 0.5), inset 0 0 60px rgba(63, 143, 214, 0.08);
}
.chart { width: 100%; height: 60vh; min-height: 380px; }
.breadcrumb {
  padding: 0.7rem 1.1rem; font-size: 0.95rem;
  border-bottom: 1px solid rgba(63, 143, 214, 0.18);
}
.crumb { cursor: pointer; color: #6f9bc4; transition: color .15s; }
.crumb:hover { color: #b8f0ff; }
.crumb.active { color: #7fd0ff; cursor: default; }
.crumb em { color: #46688c; font-style: normal; }
.map-error {
  position: absolute; top: 3.4rem; left: 50%; transform: translateX(-50%);
  padding: 0.5rem 1rem; background: rgba(10, 26, 47, 0.92);
  border: 1px solid #3f8fd6; border-radius: 6px; z-index: 2; color: #dbeeff;
}
.drill-bar {
  display: flex; flex-wrap: wrap; gap: .5rem; align-items: center;
  padding: .8rem 1.1rem;
  border-top: 1px solid rgba(63, 143, 214, 0.18);
}
.drill-bar .hint { color: #6f9bc4; font-size: .85rem; margin-right: .3rem; }
.drill-btn {
  padding: .32rem .85rem; font-size: .85rem; cursor: pointer;
  background: rgba(26, 74, 122, 0.35); color: #b8f0ff;
  border: 1px solid rgba(63, 143, 214, 0.5); border-radius: 6px;
  transition: border-color .15s, background .15s, box-shadow .15s;
}
.drill-btn:hover:not(:disabled) {
  border-color: #7fd0ff; background: rgba(47, 127, 196, 0.5);
  box-shadow: 0 0 12px rgba(79, 214, 255, 0.4);
}
.drill-btn:disabled { opacity: .35; cursor: default; }
</style>
