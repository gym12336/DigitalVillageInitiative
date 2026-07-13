<template>
  <div ref="rootRef" class="m3d-root" :style="rootStyle">
    <!-- 编辑态：未定位 → 灰色占位 -->
    <div v-if="mode === 'edit' && !isLocated" class="m3d-placeholder">
      <span class="m3d-placeholder-icon">🏔️</span>
      <span class="m3d-placeholder-text">请在属性面板输入村庄名</span>
    </div>

    <!-- 编辑态：已定位 → 静态图缩略图 -->
    <img
      v-else-if="mode === 'edit' && isLocated && !imageFailed"
      :src="staticImageUrl"
      :style="{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }"
      @error="onImageError"
      :alt="comp.props.villageName || '村庄地图'"
    />

    <!-- 编辑态：静态图加载失败 → 灰色占位 + 村名 -->
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
import { buildStaticImageUrl } from './tianditu.js'
import { getTiandituKey, getIonToken } from './mapConfig.js'

const props = defineProps({
  component: { type: Object, required: true },
  mode: { type: String, default: 'edit' },   // 'edit' | 'preview'
})

const comp = computed(() => props.component)
const isLocated = computed(() => comp.value.props.centerLng != null && comp.value.props.centerLat != null)

const rootRef = ref(null)
const cesiumContainer = ref(null)

const imageFailed = ref(false)
const errorState = ref(null)       // null | 'no-tianditu-key' | 'bad-tianditu-key' | 'no-webgl'
const errorMessage = ref('')
const terrainUnavailable = ref(false)
const terrainReason = ref('')

let sceneController = null

// 静态图 URL（编辑态）
const staticImageUrl = computed(() => {
  if (!isLocated.value) return ''
  const { centerLng, centerLat } = comp.value.props
  const w = comp.value.width || 640
  const h = comp.value.height || 420
  return buildStaticImageUrl(centerLng, centerLat, 14, Math.round(w), Math.round(h))
})

function onImageError() {
  imageFailed.value = true
}

// 属性变化时重置静态图错误状态
watch(
  () => [comp.value.props.centerLng, comp.value.props.centerLat],
  () => { imageFailed.value = false }
)

// 编辑态：watch 属性变化仅刷新静态图 URL（computed 自动处理）

// 预览态：初始化 Cesium 场景
onMounted(async () => {
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
