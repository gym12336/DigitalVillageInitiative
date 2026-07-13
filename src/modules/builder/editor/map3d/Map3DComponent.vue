<template>
  <div ref="rootRef" class="m3d-root" :style="rootStyle">
    <!-- 编辑态：未定位 → 灰色占位 -->
    <div v-if="mode === 'edit' && !isLocated" class="m3d-placeholder">
      <span class="m3d-placeholder-icon">🏔️</span>
      <span class="m3d-placeholder-text">请在属性面板输入村庄名</span>
    </div>

    <!-- 编辑态：已定位 → WMTS 瓦片拼贴缩略图 -->
    <canvas
      v-else-if="mode === 'edit' && isLocated && !imageFailed"
      ref="thumbCanvas"
      class="m3d-thumb-canvas"
      @pointerdown="onPanStart"
      @pointermove="onPanMove"
      @pointerup="onPanEnd"
    ></canvas>

    <!-- 编辑态：瓦片加载失败 → 灰色占位 + 村名 -->
    <div v-else-if="mode === 'edit' && imageFailed" class="m3d-placeholder">
      <span class="m3d-placeholder-icon">🖼️</span>
      <span class="m3d-placeholder-text">缩略图暂不可用 · {{ comp.props.villageName }}</span>
    </div>

    <!-- 预览态：Cesium 挂载容器 -->
    <div v-else-if="mode === 'preview'" ref="cesiumContainer" class="m3d-cesium-container"></div>

    <!-- 错误状态（预览态密钥缺失） -->
    <div v-if="errorState" class="m3d-error-overlay">
      <span>{{ errorMessage }}</span>
      <button v-if="errorState === 'no-tianditu-key' || errorState === 'bad-tianditu-key'" @click="retry">重试</button>
    </div>

    <!-- 地形不可用角标 -->
    <div v-if="terrainUnavailable" class="m3d-terrain-badge">
      地形数据不可用{{ terrainReason ? '（' + terrainReason + '）' : '' }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { buildMosaicTiles } from './tianditu.js'
import { getTiandituKey, getIonToken } from './mapConfig.js'
import { pixelsToLngLat } from './panMath.js'
import { state as editorState, pushHistory } from '../stageEditor.js'

const props = defineProps({
  component: { type: Object, required: true },
  mode: { type: String, default: 'edit' },   // 'edit' | 'preview'
})

const comp = computed(() => props.component)
const isLocated = computed(() => comp.value.props.centerLng != null && comp.value.props.centerLat != null)

const rootRef = ref(null)
const cesiumContainer = ref(null)
const thumbCanvas = ref(null)

const imageFailed = ref(false)
const errorState = ref(null)       // null | 'no-tianditu-key' | 'bad-tianditu-key' | 'no-webgl'
const errorMessage = ref('')
const terrainUnavailable = ref(false)
const terrainReason = ref('')

let sceneController = null
let drawToken = 0
let panState = null

function onPanStart(e) {
  if (e.button !== 0) return
  if (!thumbCanvas.value) return
  const p = comp.value.props
  if (p.centerLng == null || p.centerLat == null) return
  panState = {
    startClientX: e.clientX,
    startClientY: e.clientY,
    startLng: p.centerLng,
    startLat: p.centerLat,
    startZoom: p.thumbnailZoom ?? 17,
    pointerId: e.pointerId,
  }
  try { thumbCanvas.value.setPointerCapture(e.pointerId) } catch (_) {}
  e.stopPropagation()
}

function onPanMove(e) {
  if (!panState) return
  if (!thumbCanvas.value) return
  const stageZoom = editorState.zoom || 1
  const dxCanvas = (e.clientX - panState.startClientX) / stageZoom
  const dyCanvas = (e.clientY - panState.startClientY) / stageZoom
  thumbCanvas.value.style.transform = `translate(${dxCanvas}px, ${dyCanvas}px)`
}

function cancelPan() {
  if (thumbCanvas.value) thumbCanvas.value.style.transform = ''
  if (panState && thumbCanvas.value) {
    try { thumbCanvas.value.releasePointerCapture(panState.pointerId) } catch (_) {}
  }
  panState = null
}

function onPanEnd(e) {
  if (!panState) return
  const stageZoom = editorState.zoom || 1
  const dxCanvas = (e.clientX - panState.startClientX) / stageZoom
  const dyCanvas = (e.clientY - panState.startClientY) / stageZoom
  const dxScreen = e.clientX - panState.startClientX
  const dyScreen = e.clientY - panState.startClientY
  const distSq = dxScreen * dxScreen + dyScreen * dyScreen
  if (distSq < 9) {
    cancelPan()
    return
  }
  const { dLng, dLat } = pixelsToLngLat(dxCanvas, dyCanvas, panState.startLat, panState.startZoom)
  comp.value.props.centerLng = panState.startLng + dLng
  comp.value.props.centerLat = panState.startLat + dLat
  cancelPan()
  pushHistory()
}

function loadTileImage(url) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = url
  })
}

async function renderThumbnail() {
  if (props.mode !== 'edit') return
  if (!isLocated.value) return
  const canvas = thumbCanvas.value
  if (!canvas) return

  const dpr = window.devicePixelRatio || 1
  const cssW = canvas.clientWidth || 640
  const cssH = canvas.clientHeight || 420
  const w = Math.round(cssW)
  const h = Math.round(cssH)
  canvas.width = Math.round(cssW * dpr)
  canvas.height = Math.round(cssH * dpr)

  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, w, h)

  const { centerLng, centerLat, thumbnailZoom } = comp.value.props
  const tiles = buildMosaicTiles({
    lng: centerLng,
    lat: centerLat,
    zoom: thumbnailZoom ?? 17,
    width: w,
    height: h,
  })

  const token = ++drawToken
  const loaded = await Promise.all(tiles.map(t => loadTileImage(t.url).then(img => ({ ...t, img }))))
  if (token !== drawToken) return

  let anySuccess = false
  for (const t of loaded) {
    if (!t.img) continue
    anySuccess = true
    ctx.drawImage(t.img, t.drawX, t.drawY)
  }
  imageFailed.value = !anySuccess
}

watch(
  () => [
    comp.value.props.centerLng,
    comp.value.props.centerLat,
    comp.value.props.thumbnailZoom,
    comp.value.width,
    comp.value.height,
  ],
  () => {
    imageFailed.value = false
    renderThumbnail()
  },
  // 关键：canvas 由 v-else-if 控制显示，第一次 isLocated 从 false → true 时，
  // 默认 flush: 'pre' 会在 DOM 更新前触发 watch，此时 thumbCanvas.value 还是 null，
  // renderThumbnail 会直接早退。用 'post' 让 watch 在 DOM 挂载后再跑。
  { flush: 'post' }
)

// 编辑态：watch 属性变化仅刷新静态图 URL（computed 自动处理）

onMounted(async () => {
  if (props.mode === 'edit') {
    // canvas 需要在 DOM 挂载后一帧再拿到 clientWidth/Height
    requestAnimationFrame(() => renderThumbnail())
    return
  }
  if (props.mode !== 'preview') return
  if (!isLocated.value) return
  await initCesiumScene()
})

onUnmounted(() => {
  if (sceneController) {
    sceneController.destroy()
    sceneController = null
  }
})

async function initCesiumScene() {
  if (!cesiumContainer.value) return

  const tiandituKey = getTiandituKey()
  const ionToken = getIonToken()

  if (!tiandituKey) {
    errorState.value = 'no-tianditu-key'
    errorMessage.value = '天地图密钥未配置，请联系管理员'
    return
  }

  try {
    const { createScene } = await import('./cesiumScene.js')
    const p = comp.value.props

    sceneController = await createScene(cesiumContainer.value, {
      lng: p.centerLng,
      lat: p.centerLat,
      terrainExaggeration: p.terrainExaggeration || 1.5,
      showRangeCircle: p.showRangeCircle !== false,
      rangeRadius: p.rangeRadius || 500,
      defaultHeight: p.defaultHeight || 1200,
      defaultPitch: p.defaultPitch || 60,
      minZoomHeight: p.minZoomHeight || 500,
      maxZoomHeight: p.maxZoomHeight || 5000,
      tiandituKey,
      ionToken,
      onError: (err) => {
        if (err.type === 'no-tianditu-key') {
          errorState.value = 'no-tianditu-key'
          errorMessage.value = '天地图密钥未配置，请联系管理员'
        } else if (err.type === 'bad-tianditu-key') {
          errorState.value = 'bad-tianditu-key'
          errorMessage.value = '天地图密钥无效'
        } else if (err.type === 'no-webgl') {
          errorState.value = 'no-webgl'
          errorMessage.value = '浏览器不支持 3D 渲染'
        } else if (err.type === 'no-ion-token' || err.type === 'terrain-failed') {
          terrainUnavailable.value = true
          terrainReason.value = err.type === 'no-ion-token' ? 'Ion Token 未配置' : ''
        }
      },
    })

    if (sceneController && p.villageName) {
      sceneController.setLabel(p.villageName)
    }
  } catch (e) {
    console.error('[Map3DComponent] Cesium 初始化失败:', e)
    errorState.value = 'init-failed'
    errorMessage.value = '3D 渲染初始化失败'
  }
}

function retry() {
  errorState.value = null
  errorMessage.value = ''
  terrainUnavailable.value = false
  initCesiumScene()
}

// 预览态：watch 属性变化 → 转发给 sceneController
watch(
  () => comp.value.props.centerLng,
  (newVal) => {
    if (props.mode === 'preview' && sceneController && newVal != null) {
      sceneController.flyTo(newVal, comp.value.props.centerLat)
      sceneController.setLabel(comp.value.props.villageName || '')
    }
  }
)

watch(
  () => comp.value.props.terrainExaggeration,
  (val) => {
    if (props.mode === 'preview' && sceneController) {
      sceneController.setTerrainExaggeration(val)
    }
  }
)

watch(
  () => [comp.value.props.showRangeCircle, comp.value.props.rangeRadius],
  ([show, radius]) => {
    if (props.mode === 'preview' && sceneController) {
      sceneController.setRangeCircle(show, radius)
    }
  }
)

watch(
  () => [comp.value.props.defaultHeight, comp.value.props.defaultPitch],
  ([height, pitch]) => {
    if (props.mode === 'preview' && sceneController) {
      sceneController.setDefaultCamera(height, pitch)
    }
  }
)

watch(
  () => [comp.value.props.minZoomHeight, comp.value.props.maxZoomHeight],
  ([min, max]) => {
    if (props.mode === 'preview' && sceneController) {
      sceneController.setZoomLimits(min, max)
    }
  }
)

const rootStyle = computed(() => ({
  width: '100%',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
  borderRadius: '12px',
  pointerEvents: 'auto',
}))
</script>

<style scoped>
.m3d-root {
  background: #f2f6f8;
  border: 1px solid rgba(44, 125, 160, 0.08);
}

.m3d-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 0.5rem;
  color: #8ea3b2;
}

.m3d-placeholder-icon {
  font-size: 2rem;
  opacity: 0.5;
}

.m3d-placeholder-text {
  font-size: 0.82rem;
}

.m3d-cesium-container {
  width: 100%;
  height: 100%;
}

.m3d-thumb-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: 12px;
}

.m3d-error-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  background: rgba(242, 246, 248, 0.95);
  color: #8ea3b2;
  font-size: 0.84rem;
  z-index: 10;
  border-radius: 12px;
}

.m3d-error-overlay button {
  padding: 0.35rem 0.9rem;
  border: 1px solid #2c7da0;
  border-radius: 999px;
  background: transparent;
  color: #2c7da0;
  cursor: pointer;
  font-size: 0.78rem;
}

.m3d-terrain-badge {
  position: absolute;
  right: 6px;
  bottom: 6px;
  padding: 0.15rem 0.5rem;
  background: rgba(0, 0, 0, 0.45);
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.64rem;
  border-radius: 6px;
  z-index: 5;
  pointer-events: none;
}
</style>
