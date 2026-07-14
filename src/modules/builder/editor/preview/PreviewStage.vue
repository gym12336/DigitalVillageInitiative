<template>
  <div class="preview-stage-wrapper">
    <div v-if="errorMsg" class="preview-error">{{ errorMsg }}</div>
    <div v-else class="stage" :style="stageStyle">
      <PreviewComponent
        v-for="comp in stageComponents"
        :key="comp._index"
        :component="comp"
        :allowMap3d="comp._allowMap3d"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import PreviewComponent from './PreviewComponent.vue'

const MAX_MAP3D = 4

const route = useRoute()
const state = ref(null)
const errorMsg = ref('')

const stageStyle = computed(() => {
  if (!state.value) return {}
  return {
    width: state.value.pageWidth + 'px',
    height: state.value.pageHeight + 'px',
    background: state.value.pageBackground,
  }
})

const stageComponents = computed(() => {
  if (!state.value) return []
  let map3dCount = 0
  return state.value.components.map((c, i) => {
    const isMap3d = c.type === 'map-3d'
    const allow = !isMap3d || map3dCount < MAX_MAP3D
    if (isMap3d) map3dCount++
    return { ...c, _index: i, _allowMap3d: allow }
  })
})

onMounted(() => {
  const id = route.query.id
  const opener = window.opener
  if (!id || !opener || !opener.__previewState || !opener.__previewState[id]) {
    errorMsg.value = '预览已失效，请回到编辑器重新预览'
    return
  }
  const raw = opener.__previewState[id]
  delete opener.__previewState[id]
  if (!raw || !Array.isArray(raw.components)) {
    errorMsg.value = '预览数据异常'
    return
  }
  state.value = raw
})
</script>

<style scoped>
.preview-stage-wrapper {
  min-height: 100vh;
  background: #edf3f7;
  display: flex;
  justify-content: center;
  padding: 40px;
}
.stage {
  position: relative;
  box-shadow: 0 12px 48px rgba(36, 90, 115, 0.18);
  overflow: hidden;
}
.preview-error {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
  color: #8ea3b2;
  font-size: 0.95rem;
  font-family: "LXGW WenKai", "Noto Serif SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}
</style>
