<template>
  <div class="map2d">
    <nav class="breadcrumb">
      <button v-if="canGoUp" class="back-btn" @click="goUp">← 返回上级</button>
      <div class="crumbs">
        <span
          v-for="(name, i) in crumbs"
          :key="i"
          class="crumb"
          :class="{ active: i === crumbs.length - 1 }"
          @click="goToDepth(i)"
        >{{ name }}<em v-if="i < crumbs.length - 1"> / </em></span>
      </div>
    </nav>
    <div v-if="loadError" class="map-error">地图数据加载失败，已停留在当前层级。</div>

    <div class="chart-wrap">
      <div ref="chartEl" class="chart"></div>

      <!-- 右上角面板：默认收起为一个搜索按钮，悬停/聚焦展开 -->
      <div
        class="map-panel"
        :class="{ open: panelOpen }"
        @mouseenter="panelHover = true"
        @mouseleave="panelHover = false"
      >
        <button class="panel-toggle" title="搜索村庄 / 地区" aria-label="搜索村庄或地区" @click="panelPinned = !panelPinned"><AppIcon name="search" :size="17" /></button>

        <div class="panel-body">
          <div class="search-box">
            <span class="search-ic"><AppIcon name="search" :size="15" /></span>
            <input
              v-model="searchKeyword"
              type="text"
              :placeholder="searchPlaceholder"
              @focus="inputFocused = true"
              @blur="inputFocused = false"
              @keyup.enter="chooseFirst"
            />
            <button v-if="searchKeyword" class="search-clear" @click="searchKeyword = ''">×</button>
          </div>

          <!-- 有关键词：搜索结果（村庄 + 当前层级下的地区） -->
          <div v-if="searchKeyword.trim()" class="panel-results">
            <p v-if="!searchResults.length" class="empty-line">未找到匹配</p>
            <button
              v-for="r in searchResults"
              :key="r.key"
              class="result-item"
              @click="onResult(r)"
            >
              <span class="result-ic"><AppIcon :name="r.kind === 'village' ? 'map-pin' : 'archive'" :size="15" /></span>
              <span class="result-name">{{ r.name }}</span>
              <span class="result-tag">{{ r.kind === 'village' ? '村庄' : nextLevelLabel }}</span>
            </button>
          </div>

          <!-- 无关键词：当前层级可下钻的地区快捷列表 -->
          <div v-else-if="subRegions.length" class="panel-regions">
            <p class="region-title">{{ canDrillNow ? `${nextLevelLabel}（${subRegions.length}）` : '已到区县级（末级）' }}</p>
            <div class="region-list">
              <button
                v-for="r in subRegions"
                :key="r.adcode"
                class="drill-btn"
                :disabled="!canDrillNow"
                @click="enterRegion(r)"
              >{{ r.name }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import { createDrill, drillDown, drillUp, goToDepth as _goToDepth, current, breadcrumb, canDrill } from '@/lib/mapDrill.js'
import { createGeoLoader } from '@/lib/geoLoader.js'
import { toScatterPoints, filterByRegion } from '@/lib/villages.js'
import AppIcon from '@/components/AppIcon.vue'

// 数字展厅地图配色（对齐 docs/visual-system.md）
const C = {
  land: '#132b25',
  landBorder: '#386052',
  emphasis: '#23483d',
  emphasisBorder: '#76d8bc',
  scatter: '#c5a66a',
  scatterActive: '#76d8bc',
  scatterLabel: '#d9c894',
  tooltipBg: 'rgba(7,17,15,.96)',
  tooltipBorder: '#386052',
  tooltipText: '#f3eee4',
}

const props = defineProps({
  villages: { type: Array, default: () => [] },
  selectedId: { type: String, default: '' },
})
const emit = defineEmits(['select-village'])

const chartEl = ref(null)
const crumbs = ref(['全国'])
const canGoUp = ref(false)
const loadError = ref(false)
const subRegions = ref([])
const canDrillNow = ref(true)
let chart = null
let drill = createDrill()
const geo = createGeoLoader({ onError: () => { loadError.value = true } })
let nameToAdcode = {}

// —— 右上角面板：默认收起，悬停 / 聚焦 / 有关键词 / 钉住时展开 ——
const panelHover = ref(false)
const panelPinned = ref(false)
const inputFocused = ref(false)
const searchKeyword = ref('')
const panelOpen = computed(
  () => panelHover.value || panelPinned.value || inputFocused.value || !!searchKeyword.value.trim(),
)

// 下一层级的中文名（用于占位符 / 结果标签）
const LEVEL_NEXT = { country: '省份', province: '城市', city: '区县', district: '' }
const nextLevelLabel = computed(() => LEVEL_NEXT[current(drill).level] || '地区')
const searchPlaceholder = computed(() => {
  const here = crumbs.value[crumbs.value.length - 1]
  return here === '全国' ? '搜索村庄或省份…' : `在${here}内搜索村庄或${nextLevelLabel.value || '地区'}…`
})

// 搜索结果：当前层级内的村庄 + 可下钻地区，都按关键词过滤
const searchResults = computed(() => {
  const kw = searchKeyword.value.trim().toLowerCase()
  if (!kw) return []
  const cur = current(drill)
  const vills = filterByRegion(props.villages, cur)
    .filter((v) => v.name.toLowerCase().includes(kw))
    .slice(0, 8)
    .map((v) => ({ key: `v-${v.id}`, kind: 'village', name: v.name, village: v }))
  const regions = canDrill(drill)
    ? subRegions.value
        .filter((r) => r.name.toLowerCase().includes(kw))
        .slice(0, 8)
        .map((r) => ({ key: `r-${r.adcode}`, kind: 'region', name: r.name, region: r }))
    : []
  return [...vills, ...regions]
})

function syncCrumbs() {
  crumbs.value = breadcrumb(drill)
  canGoUp.value = drill.stack.length > 1
}

// 搜索到村庄时待定位的坐标；renderMap 结束后应用，避免被 notMerge 重置
let pendingZoom = null

// 选中搜索结果：村庄→选中并放大定位；地区→下钻
function onResult(r) {
  if (r.kind === 'village') {
    pendingZoom = Array.isArray(r.village.coord) ? r.village.coord : null
    emit('select-village', r.village.id)
    searchKeyword.value = ''
  } else {
    enterRegion(r.region)
    searchKeyword.value = ''
  }
}
function chooseFirst() {
  if (searchResults.value.length) onResult(searchResults.value[0])
}

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
      if (adcode !== String(cur.adcode)) regions.push({ name: p.name, adcode })
    }
  }
  canDrillNow.value = canDrill(drill) && regions.length > 0
  subRegions.value = regions

  const pts = toScatterPoints(filterByRegion(props.villages, cur)).map((p) => {
    const on = p.id === props.selectedId
    return {
      ...p,
      symbolSize: on ? 20 : 12,
      itemStyle: {
        color: on ? C.scatterActive : C.scatter,
        borderColor: '#ffffff',
        borderWidth: on ? 2.5 : 1.5,
        shadowColor: 'rgba(224,122,95,.5)',
        shadowBlur: on ? 14 : 6,
      },
      label: { show: on, formatter: p.name, color: C.scatterLabel, fontSize: 13, fontWeight: 600 },
    }
  })

  chart.setOption({
    backgroundColor: 'transparent',
    tooltip: {
      show: true,
      backgroundColor: C.tooltipBg,
      borderColor: C.tooltipBorder,
      borderWidth: 1,
      textStyle: { color: C.tooltipText },
      extraCssText: 'border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,.08);',
      formatter: (p) => (p.seriesType === 'scatter' ? `POINT · ${p.data.name}` : p.name),
    },
    geo: {
      map: mapName,
      roam: true,
      layoutCenter: ['50%', '52%'],
      layoutSize: '96%',
      itemStyle: {
        areaColor: C.land,
        borderColor: C.landBorder,
        borderWidth: 1,
      },
      emphasis: {
        label: { show: true, color: '#ffffff', fontSize: 13, fontWeight: 600 },
        itemStyle: { areaColor: C.emphasis, borderColor: C.emphasisBorder, borderWidth: 1.5 },
      },
      label: { show: false, color: C.scatterLabel },
      select: { itemStyle: { areaColor: C.emphasis }, label: { show: true, color: '#fff' } },
    },
    series: [
      {
        type: 'scatter',
        coordinateSystem: 'geo',
        data: pts,
        symbolSize: 12,
        emphasis: { scale: 1.3 },
        z: 5,
      },
    ],
  }, true)

  // 若有待定位坐标（来自搜索命中村庄），放大居中过去
  if (pendingZoom) {
    chart.setOption({ geo: { center: pendingZoom, zoom: 4 } })
    pendingZoom = null
  }
}

async function enterRegion(target) {
  if (!canDrill(drill)) return
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

async function goUp() {
  drill = drillUp(drill)
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
    if (params.seriesType === 'scatter') handleVillageClick(params)
    else if (params.componentType === 'geo') handleRegionClick(params)
  })
  // 点击地图空白处（非村庄散点、非地区）取消选中
  if (typeof chart.getZr === 'function') {
    chart.getZr().on('click', (e) => {
      if (!e.target && props.selectedId) emit('select-village', '')
    })
  }
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
.map2d {
  position: relative;
  border-radius: var(--radius);
  overflow: hidden;
  background: linear-gradient(160deg, #ffffff, var(--color-bg) 70%);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
}
.chart-wrap { position: relative; }
.chart { width: 100%; height: 60vh; min-height: 380px; }

/* 面包屑 + 返回上级按钮 */
.breadcrumb {
  display: flex; align-items: center; gap: .8rem;
  padding: 0.7rem 1.1rem; font-size: 0.95rem;
  border-bottom: 1px solid var(--color-border);
}
.back-btn {
  flex: none; padding: .35rem .9rem; font-size: .85rem; font-weight: 600; cursor: pointer;
  color: #fff; background: var(--color-primary);
  border: none; border-radius: 50px;
  box-shadow: 0 2px 8px rgba(107, 140, 92, .25);
  transition: filter .15s, transform .15s;
}
.back-btn:hover { filter: brightness(1.05); transform: translateX(-2px); }
.crumbs { min-width: 0; }
.crumb { cursor: pointer; color: var(--color-text-light); transition: color .15s; }
.crumb:hover { color: var(--color-primary); }
.crumb.active { color: var(--color-primary-dark); cursor: default; font-weight: 600; }
.crumb em { color: var(--color-text-light); font-style: normal; }
.map-error {
  position: absolute; top: 3.4rem; left: 50%; transform: translateX(-50%);
  padding: 0.5rem 1rem; background: #fff;
  border: 1px solid var(--color-highlight); border-radius: 8px; z-index: 2; color: var(--color-highlight);
}

/* 右上角面板：默认只见搜索按钮，展开显示搜索框 + 列表 */
.map-panel {
  position: absolute; top: 14px; right: 14px; z-index: 3;
  display: flex; flex-direction: column; align-items: flex-end;
}
.panel-toggle {
  width: 42px; height: 42px; flex: none; cursor: pointer;
  display: grid; place-items: center; font-size: 18px;
  background: rgba(255, 255, 255, .95); backdrop-filter: blur(8px);
  border: 1px solid var(--color-border); border-radius: 12px;
  box-shadow: 0 6px 20px rgba(77, 107, 62, .16);
  transition: background .15s, transform .15s;
}
.panel-toggle:hover { transform: scale(1.05); }
.map-panel.open .panel-toggle { background: var(--color-primary); color: #fff; border-color: var(--color-primary); }

.panel-body {
  width: 240px; margin-top: 8px;
  max-height: 0; overflow: hidden; opacity: 0; transform: translateY(-6px);
  transition: max-height .25s ease, opacity .2s ease, transform .2s ease;
  background: rgba(255, 255, 255, .96); backdrop-filter: blur(10px);
  border-radius: 14px; box-shadow: 0 10px 30px rgba(77, 107, 62, .16);
}
.map-panel.open .panel-body {
  max-height: 60vh; opacity: 1; transform: translateY(0);
  border: 1px solid var(--color-border); padding: .8rem;
}

.search-box {
  display: flex; align-items: center; gap: .4rem;
  padding: .45rem .6rem; background: var(--color-bg);
  border: 1px solid var(--color-border); border-radius: 10px;
}
.search-box .search-ic { font-size: .85rem; opacity: .7; }
.search-box input {
  flex: 1; min-width: 0; border: none; background: transparent; outline: none;
  font-size: .86rem; color: var(--color-text); font-family: inherit;
}
.search-clear {
  border: none; background: transparent; cursor: pointer;
  font-size: 1.1rem; line-height: 1; color: var(--color-text-light); padding: 0 .2rem;
}
.search-clear:hover { color: var(--color-highlight); }

.panel-results, .panel-regions { margin-top: .6rem; display: flex; flex-direction: column; gap: .35rem; overflow-y: auto; max-height: calc(60vh - 4rem); }
.empty-line { margin: .4rem 0; font-size: .82rem; color: var(--color-text-light); text-align: center; }
.result-item {
  display: flex; align-items: center; gap: .5rem; cursor: pointer; text-align: left;
  padding: .45rem .6rem; border-radius: 8px;
  background: var(--color-bg); border: 1px solid var(--color-border);
  color: var(--color-text); transition: all .15s; font-family: inherit;
}
.result-item:hover { background: #f0ebe4; border-color: var(--color-primary); }
.result-ic { font-size: .9rem; }
.result-name { flex: 1; font-size: .86rem; font-weight: 500; }
.result-tag { font-size: .7rem; color: var(--color-text-light); }

.region-title { margin: 0 0 .1rem; font-size: .78rem; font-weight: 600; color: var(--color-primary-dark); }
.region-list { display: flex; flex-wrap: wrap; gap: .4rem; }
.drill-btn {
  padding: .35rem .7rem; font-size: .82rem; cursor: pointer; text-align: left;
  background: var(--color-bg); color: var(--color-primary-dark);
  border: 1px solid var(--color-border); border-radius: 50px;
  transition: border-color .15s, background .15s, color .15s;
}
.drill-btn:hover:not(:disabled) {
  border-color: var(--color-highlight); background: var(--color-highlight); color: #fff;
}
.drill-btn:disabled { opacity: .5; cursor: default; }
</style>
