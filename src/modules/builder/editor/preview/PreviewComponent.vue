<template>
  <div class="preview-comp" :style="compStyle" :class="{ 'preview-comp--timeline': component.type === 'timeline' }">
    <!-- text -->
    <div
      v-if="component.type === 'text'"
      class="preview-text"
      :style="textStyle"
    >{{ component.props.text }}</div>

    <!-- image -->
    <img
      v-else-if="component.type === 'image' && component.props.src"
      :src="component.props.src"
      :alt="component.props.alt"
      draggable="false"
      :style="imageStyle"
    />
    <div v-else-if="component.type === 'image' && !component.props.src" class="preview-image-placeholder" :style="{ borderRadius: (component.props.borderRadius || 0) + 'px' }">
      图片占位
    </div>

    <!-- chart / agri-sensor / timeline / datatable → v-html -->
    <div v-else-if="component.type === 'chart'" v-html="chartSvg" />
    <div v-else-if="component.type === 'agri-sensor'" v-html="sensorHtml" />
    <div v-else-if="component.type === 'timeline'" v-html="timelineHtml" class="preview-timeline-body" />
    <div v-else-if="component.type === 'datatable'" v-html="datatableHtml" />

    <!-- layout-box -->
    <div v-else-if="component.type === 'layout-box'" class="preview-layout-box">
      <div
        v-for="(slot, i) in layoutSlots"
        :key="i"
        :style="layoutSlotStyle(slot)"
      >
        <PreviewComponent
          v-if="slot.child"
          :component="slot.child"
          :allowMap3d="allowMap3d"
        />
        <div v-else class="preview-layout-empty-slot" />
      </div>
    </div>

    <!-- flow-box -->
    <div v-else-if="component.type === 'flow-box'" class="preview-flow-box" @wheel.prevent="onFlowWheel">
      <template v-if="flowSlides.length === 0">
        <div class="preview-flow-empty">无子组件</div>
      </template>
      <template v-else>
        <div
          v-for="(slide, i) in flowSlides"
          :key="i"
          class="fb-slide"
          :style="{ transform: `translateX(${(i - flowActive) * 100}%)`, transition: `transform ${flowDuration}ms ease` }"
        >
          <PreviewComponent :component="slide" :allowMap3d="allowMap3d" />
        </div>
        <div v-if="flowSlides.length > 1" class="fb-dots">
          <span
            v-for="(_, i) in flowSlides"
            :key="i"
            class="fb-dot"
            :class="{ 'fb-dot--active': i === flowActive }"
            @click="goToSlide(i)"
          />
        </div>
      </template>
    </div>

    <!-- map-3d -->
    <Map3DComponent
      v-else-if="component.type === 'map-3d' && allowMap3d"
      :component="component"
      mode="preview"
    />
    <div v-else-if="component.type === 'map-3d' && !allowMap3d" class="preview-map3d-limit">
      实例超限，单页最多 4 个 3D 地图
    </div>

    <!-- 未知类型 -->
    <div v-else class="preview-unknown">未知组件类型: {{ component.type }}</div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useFlowBox } from './useFlowBox.js'
import { renderChartSvg } from '../chartRenderer.js'
import { renderSensorMarkup } from '../sensorRenderer.js'
import { renderTimelineMarkup } from '../timelineRenderer.js'
import { renderDatatableMarkup } from '../datatableRenderer.js'
import { calcLayoutSlots } from '../layoutBoxEngine.js'
import Map3DComponent from '../map3d/Map3DComponent.vue'
import PreviewComponent from './PreviewComponent.vue'

const props = defineProps({
  component: { type: Object, required: true },
  allowMap3d: { type: Boolean, default: true },
})

const comp = computed(() => props.component)
const p = computed(() => comp.value.props)

// ---- text ----
const textStyle = computed(() => {
  const pr = p.value
  return {
    fontSize: (pr.fontSize || 14) + 'px',
    color: pr.color || '#333',
    fontWeight: pr.fontWeight || 'normal',
    textAlign: pr.textAlign || 'left',
    background: pr.backgroundColor || 'transparent',
  }
})

// ---- image ----
const imageStyle = computed(() => ({
  objectFit: p.value.objectFit || 'fill',
  borderRadius: (p.value.borderRadius || 0) + 'px',
}))

// ---- chart / sensor / timeline / datatable ----
const chartSvg = computed(() => renderChartSvg(comp.value))
const sensorHtml = computed(() => renderSensorMarkup(comp.value))
const timelineHtml = computed(() => renderTimelineMarkup(comp.value))
const datatableHtml = computed(() => renderDatatableMarkup(comp.value))

// ---- layout-box ----
const layoutSlots = computed(() => {
  const c = comp.value
  const children = p.value.children || []
  const { slots } = calcLayoutSlots(c.width, c.height, p.value.layout, p.value.splitRatios, p.value.slotCount)
  return slots.map((s, i) => {
    const raw = children[i] || null
    const child = raw ? {
      type: raw.type,
      x: 4,
      y: 4,
      width: s.w - 8,
      height: s.h - 8,
      props: raw.props,
    } : null
    return { ...s, child }
  })
})

function layoutSlotStyle(s) {
  return {
    position: 'absolute',
    left: Math.round(s.x) + 'px',
    top: Math.round(s.y) + 'px',
    width: Math.round(s.w) + 'px',
    height: Math.round(s.h) + 'px',
    background: s.child ? '#fff' : 'rgba(0,0,0,0.02)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: s.child ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
  }
}

// ---- flow-box ----
const {
  flowActive,
  flowSlides,
  flowDuration,
  goToSlide,
  onFlowWheel,
} = useFlowBox(comp, p)

// ---- outer positioning ----
const compStyle = computed(() => {
  const c = comp.value
  return {
    position: 'absolute',
    left: c.x + 'px',
    top: c.y + 'px',
    width: c.width + 'px',
    height: c.height + 'px',
  }
})
</script>

<style scoped>
.preview-comp {
  box-sizing: border-box;
}
.preview-comp--timeline {
  overflow: visible;
}
.preview-text {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 12px;
  box-sizing: border-box;
  border-radius: 4px;
  overflow: hidden;
  word-wrap: break-word;
}
.preview-image-placeholder {
  width: 100%;
  height: 100%;
  display: grid;
  place-items: center;
  background: #f2f6f8;
  color: #687b8b;
  font-size: 13px;
}
.preview-timeline-body {
  height: 100%;
}
.preview-layout-box {
  position: relative;
  width: 100%;
  height: 100%;
  border: 1px solid #e8edf2;
  border-radius: 16px;
  background: #fafdfe;
  overflow: hidden;
}
.preview-layout-empty-slot {
  width: 100%;
  height: 100%;
  border-radius: 12px;
}
.preview-flow-box {
  position: relative;
  width: 100%;
  height: 100%;
  border: 1px solid #e8edf2;
  border-radius: 16px;
  background: #fafdfe;
  overflow: hidden;
}
.preview-flow-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #8ea3b2;
  font-size: 14px;
}
.fb-slide {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
.fb-dots {
  position: absolute;
  bottom: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  padding: 4px 12px;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 999px;
  z-index: 5;
}
.fb-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin: 0 4px;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.5);
  border: 1.5px solid rgba(255, 255, 255, 0.5);
  transition: all 0.2s;
}
.fb-dot--active {
  background: #2c7da0;
  border-color: #2c7da0;
}
.preview-map3d-limit {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #8ea3b2;
  font-size: 13px;
  background: #f2f6f8;
  border-radius: 12px;
}
.preview-unknown {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #8ea3b2;
  font-size: 13px;
  background: #f2f6f8;
  border-radius: 12px;
}
</style>
